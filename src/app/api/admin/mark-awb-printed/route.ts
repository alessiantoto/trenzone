import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function POST(request: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { orderIds } = await request.json();
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid orderIds' }, { status: 400 });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuids = orderIds.filter((id: string) => uuidRegex.test(id));
    const nonUuids = orderIds.filter((id: string) => !uuidRegex.test(id));

    const ordersMap = new Map<string, any>();

    if (uuids.length > 0) {
      const { data: uuidOrders, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id, tracking_metadata')
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
          .select('id, tracking_metadata')
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
      return NextResponse.json({ success: false, error: 'Comenzile nu au fost găsite' }, { status: 404 });
    }

    let successCount = 0;
    
    for (const order of orders) {
      const currentMeta = typeof order.tracking_metadata === 'object' && order.tracking_metadata !== null 
        ? order.tracking_metadata 
        : {};
        
      const newMeta = { ...currentMeta, printed: true };
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ tracking_metadata: newMeta })
        .eq('id', order.id);
        
      if (!updateError) {
        successCount++;
      }
    }

    return NextResponse.json({ success: true, count: successCount });
  } catch (error: any) {
    console.error('Error marking AWBs as printed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
