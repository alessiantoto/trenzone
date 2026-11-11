import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSamedayAwbPdf } from '@/lib/sameday-api';
import { getPacketaAwbPdf } from '@/lib/packeta-api';
import { detectPrimaryCourier } from '@/lib/tracking-sync';
import { PDFDocument } from 'pdf-lib';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function GET(request: Request) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json({ error: 'Niciun ID furnizat.' }, { status: 400 });
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Niciun ID valid furnizat.' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = ids.filter(id => uuidRegex.test(id));
    const nonUuids = ids.filter(id => !uuidRegex.test(id));

    const ordersMap = new Map<string, any>();

    if (uuids.length > 0) {
      const { data: uuidOrders } = await supabaseAdmin
        .from('orders')
        .select('id, tracking_number, carrier_id, addr_country')
        .in('id', uuids);
      if (uuidOrders) {
        uuidOrders.forEach(o => ordersMap.set(o.id, o));
      }
    }

    if (nonUuids.length > 0) {
      for (const rawId of nonUuids) {
        const cleanRawId = String(rawId || '').replace(/[^a-zA-Z0-9_-]/g, '');
        if (!cleanRawId) continue;
        const { data: matchedOrder } = await supabaseAdmin
          .from('orders')
          .select('id, tracking_number, carrier_id, addr_country')
          .or(`payment_intent_id.eq.${cleanRawId},receipt_url.ilike.%${cleanRawId}%`)
          .limit(1)
          .maybeSingle();
        if (matchedOrder) {
          ordersMap.set(matchedOrder.id, matchedOrder);
        }
      }
    }

    const orders = Array.from(ordersMap.values());

    if (orders.length === 0) {
      return NextResponse.json({ error: 'Comenzile nu au fost găsite.' }, { status: 404 });
    }

    const mergedPdf = await PDFDocument.create();
    let hasAddedPages = false;

    for (const order of orders) {
      if (!order.tracking_number) continue;

      const trackingNumber = order.tracking_number.trim();
      const isSameday = detectPrimaryCourier(trackingNumber, order.addr_country, order.carrier_id) === 'sameday';

      try {
        let pdfBuffer: ArrayBuffer | Buffer;
        if (isSameday) {
          pdfBuffer = await getSamedayAwbPdf(trackingNumber);
        } else {
          pdfBuffer = await getPacketaAwbPdf(trackingNumber);
        }
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        hasAddedPages = true;
      } catch (err) {
        console.error(`Eroare la preluarea PDF-ului pentru comanda ${order.id} (${trackingNumber}):`, err);
        // Continua cu urmatorul daca pica unul
      }
    }

    if (!hasAddedPages) {
      return NextResponse.json({ error: 'Nu s-au putut genera AWB-uri PDF pentru comenzile selectate.' }, { status: 400 });
    }

    const mergedPdfBytes = await mergedPdf.save();

    return new NextResponse(Buffer.from(mergedPdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="awbs_bulk_${new Date().getTime()}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('❌ [ADMIN BULK AWB PDF API] Error:', err);
    return NextResponse.json({ error: 'Eroare la generarea bulk PDF.' }, { status: 500 });
  }
}
