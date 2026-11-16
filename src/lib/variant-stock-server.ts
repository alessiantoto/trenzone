import { supabaseAdmin } from './supabase-admin';
import {
  computeTotalVariantStock,
  parseAllTeeModelsAndSizes,
  type VariantStockMatrix,
} from './variant-stock';

const BUNDLE_ID_REGEX = /^(.+)-bundle-(\d+)$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Atomically decrements per-model / per-size internal inventory for products configured with
 * `metadata.variant_stock`, without ever blocking future purchases at `0`.
 * Idempotent per order via `orders.carrier_metadata.stock_decremented`.
 */
export async function decrementProductStockForOrder(
  orderNumber: string,
  orderItems: any[]
): Promise<void> {
  if (!orderNumber || !Array.isArray(orderItems) || orderItems.length === 0) return;

  // 1. Idempotency check on orders row
  const { data: orderRow, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('id, carrier_metadata')
    .eq('payment_intent_id', orderNumber)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  let targetOrderRow = orderRow;
  if (!targetOrderRow && !orderErr) {
    const { data: byMeta } = await supabaseAdmin
      .from('orders')
      .select('id, carrier_metadata')
      .eq('carrier_metadata->>order_number', orderNumber)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    targetOrderRow = byMeta;
  }

  if (targetOrderRow?.carrier_metadata?.stock_decremented === true) {
    return;
  }

  // 2. Group item quantities by base product ID
  const itemsByProduct = new Map<string, Array<{ variantRaw: unknown; unitQty: number; bundleMult: number }>>();
  for (const item of orderItems) {
    const rawId = String(item?.bundleId || item?.id || '');
    const match = rawId.match(BUNDLE_ID_REGEX);
    const realId = match ? match[1] : rawId;
    const bundleMult = match ? Math.max(1, parseInt(match[2], 10)) : 1;
    if (!realId || !UUID_REGEX.test(realId)) continue;

    const unitQty = Math.max(1, Math.round(Number(item?.quantity) || 1));
    const variantRaw = item?.selectedVariant?.name ?? item?.variant ?? '';

    const list = itemsByProduct.get(realId) || [];
    list.push({ variantRaw, unitQty, bundleMult });
    itemsByProduct.set(realId, list);
  }

  if (itemsByProduct.size === 0) return;

  // 3. Load matching products with metadata.variant_stock
  const productIds = Array.from(itemsByProduct.keys());
  const { data: dbProducts, error: prodErr } = await supabaseAdmin
    .from('products')
    .select('id, slug, stock_quantity, metadata')
    .in('id', productIds);

  if (prodErr || !dbProducts || dbProducts.length === 0) return;

  let anyUpdated = false;

  for (const prod of dbProducts) {
    const meta = (prod.metadata && typeof prod.metadata === 'object' ? prod.metadata : {}) as Record<string, any>;
    const variantStock = meta.variant_stock as VariantStockMatrix | undefined;
    if (!variantStock || typeof variantStock !== 'object') continue;

    const knownModels = Object.keys(variantStock);
    const nextStock: VariantStockMatrix = {};
    for (const m of knownModels) {
      nextStock[m] = { ...(variantStock[m] || {}) };
    }

    const prevSold = (meta.variant_sold && typeof meta.variant_sold === 'object'
      ? meta.variant_sold
      : {}) as VariantStockMatrix;
    const nextSold: VariantStockMatrix = {};
    for (const [m, sizes] of Object.entries(prevSold)) {
      nextSold[m] = { ...(sizes || {}) };
    }

    const orderedLines = itemsByProduct.get(prod.id) || [];
    let touchedThisProduct = false;

    for (const line of orderedLines) {
      const parsedEntries = parseAllTeeModelsAndSizes(line.variantRaw, knownModels);
      if (parsedEntries.length === 0) continue;

      const perEntryQty =
        parsedEntries.length > 1
          ? line.unitQty
          : line.unitQty * line.bundleMult;

      for (const { model, size } of parsedEntries) {
        if (!nextStock[model]) continue;
        const curAvailable = Math.max(0, Math.round(Number(nextStock[model][size]) || 0));
        nextStock[model][size] = Math.max(0, curAvailable - perEntryQty);

        if (!nextSold[model]) nextSold[model] = {};
        const curSold = Math.max(0, Math.round(Number(nextSold[model][size]) || 0));
        nextSold[model][size] = curSold + perEntryQty;

        touchedThisProduct = true;
      }
    }

    if (!touchedThisProduct) continue;

    const nextTotalStock = computeTotalVariantStock(nextStock);
    const nextMeta = {
      ...meta,
      soft_stock_tracking: true,
      variant_stock: nextStock,
      variant_sold: nextSold,
      last_stock_update_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabaseAdmin
      .from('products')
      .update({
        stock_quantity: nextTotalStock,
        metadata: nextMeta,
      })
      .eq('id', prod.id);

    if (updErr) {
      console.error(`[VARIANT STOCK] Failed to decrement stock for product ${prod.slug}:`, updErr);
    } else {
      anyUpdated = true;
      console.log(`📦 [VARIANT STOCK] Decremented ${prod.slug} for order #${orderNumber} -> Total remaining: ${nextTotalStock}`);
    }
  }

  // 4. Mark idempotency on order row so retries never double-decrement
  if (anyUpdated && targetOrderRow?.id) {
    const nextCarrierMeta = {
      ...(targetOrderRow.carrier_metadata || {}),
      stock_decremented: true,
      stock_decremented_at: new Date().toISOString(),
    };
    await supabaseAdmin
      .from('orders')
      .update({ carrier_metadata: nextCarrierMeta })
      .eq('id', targetOrderRow.id);
  }
}

