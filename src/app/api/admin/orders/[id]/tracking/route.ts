import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveAwbTracking } from '@/lib/tracking-sync';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const { id: orderId } = await params;

  try {
    // 1. Get order with tracking number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let order: { id?: string; tracking_number: string | null; carrier_id?: string | null; addr_country?: string | null; status?: string | null; tracking_metadata?: any } | null = null;
    let error = null;

    if (isUuid) {
      const res = await supabaseAdmin
        .from('orders')
        .select('id, tracking_number, carrier_id, addr_country, status, tracking_metadata')
        .eq('id', orderId)
        .maybeSingle();
      order = res.data;
      error = res.error;
    } else {
      const byPi = await supabaseAdmin
        .from('orders')
        .select('id, tracking_number, carrier_id, addr_country, status, tracking_metadata')
        .eq('payment_intent_id', orderId)
        .maybeSingle();
      if (byPi.data) {
        order = byPi.data;
      } else {
        const safeId = orderId.replace(/[^a-zA-Z0-9_-]/g, '');
        const byUrl = await supabaseAdmin
          .from('orders')
          .select('id, tracking_number, carrier_id, addr_country, status, tracking_metadata')
          .ilike('receipt_url', `%${safeId}%`)
          .limit(1)
          .maybeSingle();
        order = byUrl.data;
        error = byUrl.error;
      }
    }

    if (error || !order || !order.tracking_number) {
      return NextResponse.json({ error: 'Acestei comenzi nu i-a fost încă generat un AWB.' }, { status: 404 });
    }

    // REGULĂ STRICTĂ: Odată marcată ca livrată, NU se mai interoghează deloc API-ul curierului!
    const metaStatusTextLower = (order.tracking_metadata?.statusText || '').toLowerCase();
    const isMetaDeliveredText =
      metaStatusTextLower.includes('livrat') &&
      !metaStatusTextLower.includes('nelivrat') &&
      !metaStatusTextLower.includes('undelivered');

    if (
      order.status?.toLowerCase() === 'delivered' ||
      (order.tracking_metadata && !order.tracking_metadata.failed && (
        order.tracking_metadata.delivered === true || 
        isMetaDeliveredText ||
        order.tracking_metadata.status?.toLowerCase() === 'delivered'
      ))
    ) {
      return NextResponse.json(order.tracking_metadata || {
        status: 'ok',
        statusText: 'Livrat',
        delivered: true
      });
    }

    // 2. Fetch tracking status using intelligent Sameday vs Packeta detection
    const trackingNumber = order.tracking_number;
    let status: any;

    try {
      status = await resolveAwbTracking(trackingNumber, order.carrier_id, order.addr_country);
    } catch (resolveErr) {
      status = { error: true, statusText: 'Eroare / Indisponibil' };
    }

    if (status && (!status.error || status.failed)) {
      let newStatus: string | null = null;
      if (status.failed) {
        newStatus = 'returned';
      } else if (status.delivered) {
        newStatus = 'delivered';
      } else if (status.status === 'ok' && (order.status === 'pending' || order.status === 'processing')) {
        newStatus = 'shipped';
      }

      const existingMeta = (typeof order.tracking_metadata === 'object' && order.tracking_metadata) ? order.tracking_metadata : {};
      const isPrinted = Boolean(
        existingMeta.printed || 
        status.delivered || 
        status.statusCode === 7 ||
        newStatus === 'delivered' || 
        order.status === 'delivered'
      );

      let updateQuery = supabaseAdmin
        .from('orders')
        .update({ 
          tracking_metadata: {
            ...existingMeta,
            ...status,
            printed: isPrinted
          },
          ...(newStatus ? { status: newStatus } : {})
        });

      if (order.id) {
        await updateQuery.eq('id', order.id);
      } else {
        await updateQuery.eq('tracking_number', trackingNumber);
      }
    }

    return NextResponse.json(status);

  } catch (err: any) {
    console.error('❌ [ADMIN TRACKING API] Error:', err);
    return NextResponse.json({ error: 'Eroare la preluarea statusului de livrare.' }, { status: 500 });
  }
}
