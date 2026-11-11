import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateInvoicePdf } from '@/lib/invoice';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 🛡️ NEXT 15/16 FIX: params must be awaited
  const { id: orderId } = await params;

  try {
    // 🛡️ EXAMPLE INVOICE HANDLING
    if (orderId === 'EXAMPLE') {
      const pdfBuffer = await generateInvoicePdf({
        id: 'TZ-EXEMPLU',
        date: new Date().toLocaleDateString('ro-RO'),
        currency: 'RON',
        total: 220,
        subtotal: 200,
        shipping: 20,
        discount: 0,
        locale: 'ro',
        paymentMethod: 'card',
        customer: {
          name: 'Ion Popescu (Exemplu)',
          firstName: 'Ion',
          lastName: 'Popescu',
          email: 'ion@exemplu.ro',
          phone: '0700 000 000',
          address: 'Strada Fictivă nr. 1, București, 012345, RO',
          addr_line1: 'Strada Fictivă nr. 1',
          addr_city: 'București',
          addr_zip: '012345',
          addr_country: 'RO',
        },
        items: [
          { name: 'X10 Elbow Wraps — Purple', quantity: 1, price: 529.99 },
          { name: 'X5 Elbow Wraps — Blue', quantity: 1, price: 329.99 },
        ],
        trackingNumber: 'AWB123456789'
      } as any);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="Factura-Exemplu.pdf"',
        },
      });
    }

    // 1. Fetch order data from Supabase
    // STRATEGY: We first search by payment_intent_id (as it's a text column) 
    // to avoid Postgres throwing an error if orderId is not a valid UUID format.
    
    let { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('payment_intent_id', orderId)
      .maybeSingle();

    // FALLBACK 1: If not found and it looks like a UUID, search by internal ID
    if (!order && !error && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
      const { data: uuidOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      
      order = uuidOrder;
    }

    // FALLBACK 2: Search for the sequential ID (CHAMP-xxxx or TZ-xxxx) in the receipt_url
    if (!order && !error) {
      const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (safeId) {
        const { data: champOrder } = await supabaseAdmin
          .from('orders')
          .select('*')
          .ilike('receipt_url', `%${safeId}%`)
          .limit(1)
          .maybeSingle();
        
        order = champOrder;
      }
    }

    if (error) {
      console.error('❌ [ADMIN PDF API] Database Error:', error);
      return NextResponse.json({ error: `Eroare bază de date: ${error.message}` }, { status: 500 });
    }

    if (!order) {
      // LAST RESORT: Try to find ANY order to see if we are even connected correctly
      const { data: anyOrder } = await supabaseAdmin.from('orders').select('id').limit(1);
      console.warn('⚠️ [ADMIN PDF API] Order not found. Connectivity check:', anyOrder ? 'Connected' : 'No rows in table');
      
      return NextResponse.json({ 
        error: 'Comanda nu a fost găsită.',
        details: `Căutat ID: ${orderId}. Conexiune DB: ${anyOrder ? 'Activă' : 'Fără date'}`
      }, { status: 404 });
    }

    // 2. Format data for the PDF generator
    const displayId = getCanonicalOrderNumber(order);
    const pdfData = {
      id: displayId,
      date: new Date(order.created_at).toLocaleDateString('ro-RO'),
      currency: order.currency,
      total: order.total_amount,
      subtotal: order.subtotal,
      shipping: order.shipping_amount ?? (order.carrier_metadata as any)?.shipping_cost ?? 0,
      discount: order.discount_total || 0,
      discountCode: (order.carrier_metadata as any)?.coupon_code || null,
      locale: order.locale || 'ro',
      paymentMethod: order.payment_method,
      priorityProcessing: order.priority_processing || false,
      giftPackaging: order.gift_packaging || false,
      giftMessage: order.gift_message || null,
      cardDiscount: order.carrier_metadata?.card_discount || 0,
      customer: {
        name: `${order.customer_firstname} ${order.customer_lastname}`.trim(),
        firstName: order.customer_firstname,
        lastName: order.customer_lastname,
        email: order.customer_email,
        phone: order.customer_phone,
        address: `${order.addr_line1}, ${order.addr_city}, ${order.addr_zip}, ${order.addr_country}`,
        addr_line1: order.addr_line1,
        addr_city: order.addr_city,
        addr_zip: order.addr_zip,
        addr_country: order.addr_country,
      },
      trackingNumber: order.tracking_number
    };

    // 2b. Enrich items: normalize names only (no images on invoice)
    const enrichedItems = (order.items || []).map((item: any) => {
      let name = typeof item.name === 'object'
        ? (item.name[order.locale || 'ro'] || item.name['ro'] || item.name['en'] || 'Produs')
        : (item.name || 'Produs');
      
      const variantRaw = item.selectedVariant?.name || item.variant || null;
      const variantStr = typeof variantRaw === 'object' && variantRaw !== null
        ? (variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
        : (variantRaw || '');
      
      const hasVariantInName = variantStr && (
        name.includes(`(${variantStr})`) || 
        name.toLowerCase().includes(`(${variantStr.toLowerCase()})`)
      );

      if (variantStr && !hasVariantInName) {
        name = `${name} (${variantStr})`;
      }

      return { ...item, name, image: '' };
    });

    // 3. Generate PDF
    const pdfBuffer = await generateInvoicePdf({ ...pdfData, items: enrichedItems } as any);



    const customerName = pdfData.customer.name || 'Client';
    const safeCustomerName = customerName.replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const safeOrderId = pdfData.id.replace('-', '');

    // 4. Return as PDF stream
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Factura-${safeOrderId}-${safeCustomerName}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error('❌ [ADMIN PDF API] Error:', err);
    return NextResponse.json({ error: 'Eroare la generarea facturii.' }, { status: 500 });
  }
}
