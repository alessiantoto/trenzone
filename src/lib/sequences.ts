import { supabaseAdmin } from './supabase-admin';

/**
 * Fetches the next sequential order number from the database and formats it.
 * Format: TZ-[A-Za-z0-9-]+
 * Stores and increments the last order sequence number in `store_settings` (key: 'order_counter').
 */
export async function getNextOrderNumber(): Promise<string> {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateSuffix = `${day}${month}${year}`;

  try {
    // 0. Try atomic database RPC function first if created in Supabase SQL editor
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('increment_invoice_counter');
    if (!rpcError && rpcData) {
      const paddedNumber = String(Number(rpcData)).padStart(4, '0');
      return `TZ-${paddedNumber}-${dateSuffix}`;
    }

    // 1. Fallback: Fetch current counter from store_settings
    const { data: row, error: fetchError } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'order_counter')
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    let currentNumber = 0;

    if (row?.value) {
      const val = row.value;
      currentNumber = typeof val === 'number' 
        ? val 
        : Number(val.last_number || val.counter || 0);
    }

    // 2. If counter is not initialized yet, initialize from the max existing order number or count
    if (currentNumber === 0) {
      const { count } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true });
      let maxSeen = count || 0;

      const { data: recentOrders } = await supabaseAdmin
        .from('orders')
        .select('payment_intent_id, receipt_url')
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentOrders) {
        for (const o of recentOrders) {
          const str = `${o.payment_intent_id || ''} ${o.receipt_url || ''}`;
          const m = str.match(/TZ-(\d{1,6})-/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (!isNaN(num) && num < 500000 && num > maxSeen) {
              maxSeen = num;
            }
          }
        }
      }
      currentNumber = maxSeen;
    }

    const nextNumber = currentNumber + 1;

    // 3. Persist the incremented counter back to store_settings
    const { error: upsertError } = await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'order_counter',
        value: {
          last_number: nextNumber,
          updated_at: new Date().toISOString()
        }
      });

    if (upsertError) {
      console.warn('⚠️ [SEQUENCES] Could not upsert order_counter to store_settings:', upsertError);
    }

    const paddedNumber = String(nextNumber).padStart(4, '0');
    return `TZ-${paddedNumber}-${dateSuffix}`;
  } catch (err) {
    console.error('❌ [SEQUENCES] Fatal error generating sequential order number:', err);
    // Fallback based on timestamp + random suffix so it never collides
    const tsPart = String(Date.now()).slice(-5);
    const randPart = String(Math.floor(Math.random() * 90 + 10));
    return `TZ-${tsPart}${randPart}-${dateSuffix}`;
  }
}
