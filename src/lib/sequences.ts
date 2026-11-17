import { supabaseAdmin } from './supabase-admin';

function getBucharestDateSuffix(date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bucharest',
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    if (map.day && map.month && map.year) {
      return `${map.day}${map.month}${map.year}`;
    }
  } catch {
    // Fallback below if Intl timeZone is unavailable
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}

function formatOrderNumber(seq: number, dateSuffix: string): string {
  const safeSeq = Math.max(1, Math.floor(seq));
  const paddedNumber = String(safeSeq).padStart(4, '0');
  return `TZ-${paddedNumber}-${dateSuffix}`;
}

async function orderNumberExists(candidate: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('payment_intent_id', candidate)
      .limit(1)
      .maybeSingle();
    if (error) return false;
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

async function scanMaxOrderSequence(): Promise<number> {
  let maxSeen = 0;
  try {
    const { count } = await supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true });
    if (typeof count === 'number' && Number.isFinite(count) && count > maxSeen) {
      maxSeen = count;
    }

    const { data: recentOrders } = await supabaseAdmin
      .from('orders')
      .select('payment_intent_id, receipt_url, carrier_metadata')
      .order('created_at', { ascending: false })
      .limit(100);

    if (recentOrders) {
      for (const o of recentOrders) {
        const metaOrderNum = (o.carrier_metadata as any)?.order_number || '';
        const str = `${o.payment_intent_id || ''} ${o.receipt_url || ''} ${metaOrderNum}`;
        // Prefer canonical TZ-<seq>-<DDMMYY> format so legacy TZ-2026-9003 doesn't skew the sequence
        const m = str.match(/TZ-(\d{1,6})-\d{6}/i);
        if (m) {
          const num = parseInt(m[1], 10);
          if (!isNaN(num) && num < 500000 && num > maxSeen) {
            maxSeen = num;
          }
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [SEQUENCES] Failed scanning existing orders for max sequence:', err);
  }
  return maxSeen;
}

/**
 * Fetches the next sequential order number from the database and formats it.
 * Format: TZ-XXXX-DDMMYY (Romania time)
 * Uses atomic RPC if available, falling back to optimistic CAS on `store_settings` ('order_counter'),
 * and finally a timestamp/random fallback so checkout never fails with a 500.
 */
export async function getNextOrderNumber(): Promise<string> {
  const dateSuffix = getBucharestDateSuffix();

  try {
    // 0. Try atomic database RPC function first if present in Supabase
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('increment_invoice_counter');
    if (!rpcError && rpcData !== null && rpcData !== undefined) {
      const rpcNum = Number(rpcData);
      if (Number.isFinite(rpcNum) && rpcNum > 0) {
        const rpcCandidate = formatOrderNumber(rpcNum, dateSuffix);
        if (!(await orderNumberExists(rpcCandidate))) {
          return rpcCandidate;
        }
      }
    }

    // 1. Atomic Compare-And-Swap (CAS) fallback against `store_settings` ('order_counter')
    const maxAttempts = 6;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data: row, error: fetchError } = await supabaseAdmin
        .from('store_settings')
        .select('value')
        .eq('key', 'order_counter')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      let currentNumber = 0;
      if (row?.value !== null && row?.value !== undefined) {
        const val = row.value;
        const parsed =
          typeof val === 'number'
            ? val
            : Number((val as any).last_number ?? (val as any).counter ?? 0);
        if (Number.isFinite(parsed) && parsed > 0) {
          currentNumber = Math.floor(parsed);
        }
      }

      if (!row || currentNumber <= 0) {
        const scanned = await scanMaxOrderSequence();
        currentNumber = Math.max(currentNumber, scanned);
      }

      let nextNumber = currentNumber + 1;
      let candidate = formatOrderNumber(nextNumber, dateSuffix);

      // Guard against stale counter if an order with this number already exists
      if (await orderNumberExists(candidate)) {
        const scanned = await scanMaxOrderSequence();
        nextNumber = Math.max(nextNumber + 1, scanned + 1);
        candidate = formatOrderNumber(nextNumber, dateSuffix);
      }

      const nextPayload = {
        last_number: nextNumber,
        updated_at: new Date().toISOString(),
      };

      if (!row) {
        const { data: inserted, error: insertErr } = await supabaseAdmin
          .from('store_settings')
          .insert({ key: 'order_counter', value: nextPayload })
          .select('value')
          .maybeSingle();

        if (!insertErr && inserted) {
          return candidate;
        }
      } else if (typeof row.value === 'object' && row.value !== null && 'last_number' in row.value) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('store_settings')
          .update({ value: nextPayload })
          .eq('key', 'order_counter')
          .eq('value->>last_number', String((row.value as any).last_number))
          .select('value')
          .maybeSingle();

        if (!updateErr && updated) {
          return candidate;
        }
      } else if (typeof row.value === 'object' && row.value !== null && 'counter' in row.value) {
        const { data: updated, error: updateErr } = await supabaseAdmin
          .from('store_settings')
          .update({ value: nextPayload })
          .eq('key', 'order_counter')
          .eq('value->>counter', String((row.value as any).counter))
          .select('value')
          .maybeSingle();

        if (!updateErr && updated) {
          return candidate;
        }
      } else {
        const { data: upserted, error: upsertErr } = await supabaseAdmin
          .from('store_settings')
          .upsert({ key: 'order_counter', value: nextPayload }, { onConflict: 'key' })
          .select('value')
          .maybeSingle();

        if (!upsertErr && upserted) {
          return candidate;
        }
      }

      // CAS contention: wait briefly with jitter before retrying
      await new Promise((resolve) => setTimeout(resolve, 15 + Math.floor(Math.random() * 25)));
    }

    console.warn('⚠️ [SEQUENCES] CAS retries exhausted on order_counter, using unique fallback.');
  } catch (err) {
    console.error('❌ [SEQUENCES] Error generating sequential order number:', err);
  }

  // Safe non-throwing collision-resistant fallback
  const tsPart = String(Date.now()).slice(-5);
  const randPart = String(Math.floor(Math.random() * 90 + 10));
  return `TZ-${tsPart}${randPart}-${dateSuffix}`;
}
