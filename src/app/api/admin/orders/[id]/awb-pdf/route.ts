import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getSamedayAwbPdf } from '@/lib/sameday-api';
import { getPacketaAwbPdf } from '@/lib/packeta-api';
import { detectPrimaryCourier } from '@/lib/tracking-sync';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: orderId } = await params;

  try {
    // Robust lookup: prefer UUID, fallback to payment_intent_id / receipt_url
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

    let order: { tracking_number: string | null; carrier_id: string | number | null; addr_country?: string | null } | null = null;

    if (isUuid) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('tracking_number, carrier_id, addr_country')
        .eq('id', orderId)
        .maybeSingle();
      order = data;
    } else {
      // Try payment_intent_id first
      const { data: byPi } = await supabaseAdmin
        .from('orders')
        .select('tracking_number, carrier_id, addr_country')
        .eq('payment_intent_id', orderId)
        .maybeSingle();
      if (byPi) {
        order = byPi;
      } else {
        const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
        if (safeId) {
          // Try receipt_url contains orderId (TZ-[A-Za-z0-9-]+)
          const { data: byUrl } = await supabaseAdmin
            .from('orders')
            .select('tracking_number, carrier_id, addr_country')
            .ilike('receipt_url', `%${safeId}%`)
            .limit(1)
            .maybeSingle();
          order = byUrl;
        }
      }
    }

    if (!order || !order.tracking_number) {
      return NextResponse.json({ error: 'Comanda nu are un AWB generat.' }, { status: 404 });
    }

    const trackingNumber = order.tracking_number;
    const carrierId = String(order.carrier_id || '');

    // Detecție inteligentă Sameday vs Packeta pe baza țării și prefixului AWB
    const isSameday = detectPrimaryCourier(trackingNumber, order.addr_country, carrierId) === 'sameday';

    if (!isSameday) {
      // Packeta logic
      const pdfBuffer = await getPacketaAwbPdf(trackingNumber);
      return new NextResponse(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="packeta_awb_${trackingNumber}.pdf"`,
        },
      });
    }

    const pdfBuffer = await getSamedayAwbPdf(trackingNumber);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="sameday_awb_${trackingNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('❌ [ADMIN AWB PDF API] Error:', err);
    return NextResponse.json({ error: 'Eroare la preluarea PDF-ului AWB.' }, { status: 500 });
  }
}
