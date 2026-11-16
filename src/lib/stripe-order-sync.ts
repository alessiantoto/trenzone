import Stripe from 'stripe';
import { supabaseAdmin } from './supabase-admin';
import { getNextOrderNumber } from './sequences';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { getSingleFlavorImage, resolveItemImage } from './product-images';
import { processOrder, type OrderData } from './orders';
import { isDigitalProgramItem } from './programs';

/**
 * Currencies that Stripe represents in whole units (no /100 subunits).
 * Explicitly includes HUF alongside JPY, KRW, CLP, VND, etc.
 */
export const ZERO_DECIMAL_CURRENCIES = [
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'HUF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
] as const;

export function isZeroDecimalCurrency(currency?: string | null): boolean {
  if (!currency) return false;
  return (ZERO_DECIMAL_CURRENCIES as readonly string[]).includes(currency.trim().toUpperCase());
}

export function getCurrencyMultiplier(currency?: string | null): 1 | 100 {
  return isZeroDecimalCurrency(currency) ? 1 : 100;
}

const MAX_STRIPE_METADATA_VALUE_LEN = 500;
const STANDARD_ITEM_CHUNK_KEYS = ['order_items', 'order_items_2', 'order_items_3', 'order_items_4'] as const;

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key';
  return new Stripe(key, {
    apiVersion: '2025-02-24.acacia',
  });
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.trim() && !key.includes('dummy'));
}

export interface CompactOrderItem {
  id: string;
  quantity: number;
  price: number;
  variant: string;
  name: string;
  selectedVariant?: any;
  image?: string;
}

export interface EnsureStripeOrderResult {
  outcome: 'created' | 'recovered' | 'already_exists';
  orderId: string;
  dbId?: string;
  paymentIntentId: string;
  stripeReceiptNumber?: string | null;
  stripeChargeId?: string | null;
}

/**
 * In-memory Single-Flight lock keyed by payment_intent_id.
 * Concurrent callers (e.g. Webhook + Verify fallback) await the exact same Promise
 * instead of allocating a second order number or inserting duplicate rows.
 */
const inFlightSyncLocks = new Map<string, Promise<EnsureStripeOrderResult>>();

function resolveLocalizedString(val: any, locale: 'ro' | 'en' = 'ro'): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const picked =
      locale === 'en'
        ? val.en ?? val.ro ?? Object.values(val)[0]
        : val.ro ?? val.en ?? Object.values(val)[0];
    return typeof picked === 'string' ? picked : String(picked || '');
  }
  return String(val);
}

function sanitizeMetadataToken(val: string, maxLen: number): string {
  return String(val || '')
    .replace(/\|/g, '-')
    .replace(/\^\^/g, '--')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .substring(0, maxLen);
}

/**
 * Serializes order items into compact `id|qty|price|variant|name` entries joined by `^^`
 * and packs them cleanly onto `order_items`, `order_items_2`, `order_items_3`, `order_items_4`
 * (and `order_items_5+` if huge carts exceed 2000 chars) strictly along item boundaries so an
 * item or variant is NEVER cut mid-entry. Clears unused standard keys (`""`) on PI update.
 */
export function encodeOrderItemsForStripeMetadata(
  items: any[],
  locale: 'ro' | 'en' = 'ro'
): Record<string, string> {
  const result: Record<string, string> = {
    order_items: '',
    order_items_2: '',
    order_items_3: '',
    order_items_4: '',
  };

  if (!Array.isArray(items) || items.length === 0) {
    return result;
  }

  const entries: string[] = items.map((raw) => {
    const id = sanitizeMetadataToken(String(raw?.id || raw?.slug || 'item'), 80);
    const qty = Math.max(1, Math.floor(Number(raw?.quantity ?? raw?.q ?? 1) || 1));
    const numPrice = Number(raw?.price ?? raw?.p ?? 0);
    const priceStr = Number.isFinite(numPrice) ? String(Math.round(numPrice * 100) / 100) : '0';

    const rawVariant =
      raw?.selectedVariant?.name ??
      raw?.variant ??
      raw?.v ??
      '';
    let variant = sanitizeMetadataToken(resolveLocalizedString(rawVariant, locale), 160);
    let name = sanitizeMetadataToken(
      resolveLocalizedString(raw?.name ?? raw?.n, locale) || (locale === 'en' ? 'Product' : 'Produs'),
      160
    );

    const prefix = `${id}|${qty}|${priceStr}|`;
    const budget = MAX_STRIPE_METADATA_VALUE_LEN - prefix.length - 1; // 1 for '|'
    if (variant.length + name.length > budget) {
      const halfBudget = Math.max(20, Math.floor(budget / 2));
      if (variant.length > halfBudget && name.length > halfBudget) {
        variant = variant.substring(0, halfBudget);
        name = name.substring(0, Math.max(10, budget - variant.length));
      } else if (name.length > variant.length) {
        name = name.substring(0, Math.max(10, budget - variant.length));
      } else {
        variant = variant.substring(0, Math.max(10, budget - name.length));
      }
    }

    return `${prefix}${variant}|${name}`;
  });

  const chunks: string[] = [];
  let current = '';

  for (const entry of entries) {
    if (!current) {
      current = entry.substring(0, MAX_STRIPE_METADATA_VALUE_LEN);
      continue;
    }

    const candidate = `${current}^^${entry}`;
    if (candidate.length <= MAX_STRIPE_METADATA_VALUE_LEN) {
      current = candidate;
    } else {
      chunks.push(current);
      current = entry.substring(0, MAX_STRIPE_METADATA_VALUE_LEN);
    }
  }

  if (current) {
    chunks.push(current);
  }

  chunks.forEach((chunk, index) => {
    const key = index === 0 ? 'order_items' : `order_items_${index + 1}`;
    result[key] = chunk;
  });

  // Explicitly ensure all 4 standard keys exist so PaymentIntent.update clears stale values
  for (const key of STANDARD_ITEM_CHUNK_KEYS) {
    if (!(key in result)) {
      result[key] = '';
    }
  }

  return result;
}

/**
 * Joins `order_items`..`order_items_N` back together safely whether encoded with
 * item-boundary chunks (`encodeOrderItemsForStripeMetadata`), legacy 500-char slices,
 * or legacy JSON arrays.
 */
function joinOrderItemMetadataChunks(metadata: Record<string, any>): string {
  const keys = Object.keys(metadata || {})
    .filter((k) => k === 'order_items' || /^order_items_\d+$/.test(k))
    .sort((a, b) => {
      const na = a === 'order_items' ? 1 : parseInt(a.replace('order_items_', ''), 10);
      const nb = b === 'order_items' ? 1 : parseInt(b.replace('order_items_', ''), 10);
      return na - nb;
    });

  const chunks = keys
    .map((k) => (typeof metadata[k] === 'string' ? metadata[k] : ''))
    .filter((v) => v.length > 0);

  if (chunks.length === 0) return '';

  if (chunks[0].trimStart().startsWith('[')) {
    return chunks.join('');
  }

  // Recombine item-boundary chunks vs legacy arbitrary-slice chunks without dropping items.
  let combined = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const prev = combined;
    const next = chunks[i];

    if (prev.endsWith('^^') || next.startsWith('^^') || (prev.endsWith('^') && next.startsWith('^'))) {
      combined = prev + next;
      continue;
    }

    const lastEntryOfPrev = prev.split('^^').pop() || '';
    const firstEntryOfNext = next.split('^^')[0] || '';
    const prevPipeCount = (lastEntryOfPrev.match(/\|/g) || []).length;
    const nextStartsLikeCompactEntry = /^[^|]+\|\d+\|\d+(?:\.\d+)?\|/.test(firstEntryOfNext);

    if (prevPipeCount >= 4 && nextStartsLikeCompactEntry) {
      combined = `${prev}^^${next}`;
    } else {
      combined = prev + next;
    }
  }

  return combined;
}

/**
 * Parses `order_items..order_items_4` (and higher) from Stripe metadata.
 * Supports:
 * 1) Compact `id|qty|price|variant|name` separated by `^^`
 * 2) JSON array fallback (including partial recovery if legacy JSON was truncated)
 * 3) Legacy `ID:QTY,ID2:QTY2` fallback
 */
export function parseOrderItemsFromMetadata(metadata?: Record<string, any> | null): CompactOrderItem[] {
  if (!metadata || typeof metadata !== 'object') return [];
  const rawCombined = joinOrderItemMetadataChunks(metadata).trim();
  if (!rawCombined) return [];

  // 1. JSON format (legacy checkout sessions)
  if (rawCombined.startsWith('[')) {
    let parsedJson: any[] | null = null;
    try {
      const candidate = JSON.parse(rawCombined);
      if (Array.isArray(candidate)) parsedJson = candidate;
    } catch {
      // Attempt partial JSON recovery up to the last closed object
      const lastBrace = rawCombined.lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          const recovered = JSON.parse(`${rawCombined.slice(0, lastBrace + 1)}]`);
          if (Array.isArray(recovered)) parsedJson = recovered;
        } catch {
          parsedJson = null;
        }
      }
    }

    if (parsedJson) {
      return parsedJson.map((entry: any) => {
        const variantStr = typeof entry?.v === 'string'
          ? entry.v
          : resolveLocalizedString(entry?.selectedVariant?.name ?? entry?.variant ?? '', 'ro');
        const nameStr = resolveLocalizedString(entry?.n ?? entry?.name ?? '', 'ro') || 'Produs';
        return {
          id: String(entry?.i ?? entry?.id ?? 'unknown'),
          quantity: Math.max(1, Number(entry?.q ?? entry?.quantity ?? 1) || 1),
          price: Number(entry?.p ?? entry?.price ?? 0) || 0,
          variant: variantStr,
          name: nameStr,
          selectedVariant: variantStr ? { name: variantStr } : null,
        };
      });
    }
  }

  // 2. Compact ^^ format
  if (rawCombined.includes('|')) {
    return rawCombined
      .split('^^')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [rawId, rawQty, rawPrice, rawVariant, ...restName] = entry.split('|');
        const name = restName.join('|').trim() || 'Produs';
        const variant = (rawVariant || '').trim();
        return {
          id: (rawId || 'unknown').trim(),
          quantity: Math.max(1, parseInt(rawQty || '1', 10) || 1),
          price: Number.parseFloat(rawPrice || '0') || 0,
          variant,
          name,
          selectedVariant: variant ? { name: variant } : null,
        };
      });
  }

  // 3. Legacy ID:QTY comma-separated fallback
  return rawCombined
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [id, q] = pair.split(':');
      return {
        id: (id || 'unknown').trim(),
        quantity: Math.max(1, parseInt(q || '1', 10) || 1),
        price: 0,
        variant: '',
        name: 'Produs',
        selectedVariant: null,
      };
    });
}

export interface CheckoutSessionBackupInput {
  paymentIntentId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  shippingType?: string | null;
  carrierId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  items: any[];
  totalAmount?: number;
  currency?: string;
}

/**
 * Persists full untruncated cart items (including full `selectedVariant`, images, names,
 * server-validated prices) and customer/shipping fields into `checkout_sessions` keyed by `payment_intent_id`.
 */
export async function backupCheckoutSessionForPI(input: CheckoutSessionBackupInput): Promise<void> {
  if (!input.paymentIntentId) return;

  try {
    const cleanEmail = (input.email || '').trim().toLowerCase();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('checkout_sessions')
      .select('id, status, email, first_name, last_name, phone, line1, line2, city, state, postal_code, country')
      .eq('payment_intent_id', input.paymentIntentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr) {
      console.warn('⚠️ [CHECKOUT SESSION BACKUP] Fetch warning:', fetchErr.message);
      return;
    }

    if (existing?.status === 'completed') {
      return;
    }

    const payload: Record<string, any> = {
      payment_intent_id: input.paymentIntentId,
      email: cleanEmail || existing?.email || '',
      first_name: (input.firstName ?? existing?.first_name ?? '').toString().trim(),
      last_name: (input.lastName ?? existing?.last_name ?? '').toString().trim(),
      phone: (input.phone ?? existing?.phone ?? '').toString().trim(),
      line1: (input.line1 ?? existing?.line1 ?? '').toString().trim(),
      line2: (input.line2 ?? existing?.line2 ?? null) ? String(input.line2 ?? existing?.line2).trim() : null,
      city: (input.city ?? existing?.city ?? '').toString().trim(),
      state: (input.state ?? existing?.state ?? null) ? String(input.state ?? existing?.state).trim() : null,
      postal_code: (input.postalCode ?? existing?.postal_code ?? '').toString().trim(),
      country: (input.country ?? existing?.country ?? 'RO').toString().trim().toUpperCase(),
      shipping_type: input.shippingType || null,
      carrier_id: input.carrierId ? String(input.carrierId) : null,
      branch_id: input.branchId ? String(input.branchId) : null,
      branch_name: input.branchName || null,
      items: input.items,
      total_amount: Number.isFinite(Number(input.totalAmount)) ? Number(input.totalAmount) : 0,
      currency: (input.currency || 'RON').toUpperCase(),
      status: 'initiated',
    };

    if (existing?.id) {
      const { error: updateErr } = await supabaseAdmin
        .from('checkout_sessions')
        .update(payload)
        .eq('id', existing.id);
      if (updateErr) {
        console.warn('⚠️ [CHECKOUT SESSION BACKUP] Update warning:', updateErr.message);
      }
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from('checkout_sessions')
        .insert(payload);
      if (insertErr) {
        console.warn('⚠️ [CHECKOUT SESSION BACKUP] Insert warning:', insertErr.message);
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [CHECKOUT SESSION BACKUP] Unexpected error:', err?.message || err);
  }
}

export async function markCheckoutSessionCompleted(paymentIntentId?: string | null, email?: string | null): Promise<void> {
  try {
    if (paymentIntentId) {
      await supabaseAdmin
        .from('checkout_sessions')
        .update({ status: 'completed' })
        .eq('payment_intent_id', paymentIntentId);
    }
    if (email && email.trim() && !email.includes('lipsa-email@')) {
      await supabaseAdmin
        .from('checkout_sessions')
        .update({ status: 'completed' })
        .eq('email', email.trim().toLowerCase())
        .eq('status', 'initiated');
    }
  } catch (err: any) {
    console.warn('⚠️ [CHECKOUT SESSION] Mark completed warning:', err?.message || err);
  }
}

async function resolveExpandedCharge(
  pi: Stripe.PaymentIntent,
  stripe: Stripe
): Promise<Stripe.Charge | null> {
  if (!pi.latest_charge) return null;
  if (typeof pi.latest_charge === 'object') {
    return pi.latest_charge as Stripe.Charge;
  }
  try {
    return await stripe.charges.retrieve(pi.latest_charge);
  } catch (err: any) {
    console.warn(`⚠️ [STRIPE SYNC] Could not retrieve latest_charge ${pi.latest_charge}:`, err?.message || err);
    return null;
  }
}

export async function getExpandedPaymentIntent(piOrId: string | Stripe.PaymentIntent): Promise<Stripe.PaymentIntent> {
  const stripe = getStripeClient();
  const piId = typeof piOrId === 'string' ? piOrId : piOrId.id;

  // Always retrieve fresh state with latest_charge expanded when an unexpanded PI or ID is passed
  if (typeof piOrId === 'string') {
    return stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
  }

  if (piOrId.latest_charge && typeof piOrId.latest_charge === 'object') {
    return piOrId;
  }

  if (isStripeConfigured()) {
    try {
      return await stripe.paymentIntents.retrieve(piId, { expand: ['latest_charge'] });
    } catch {
      return piOrId;
    }
  }

  return piOrId;
}

function matchSessionItem(
  metaItem: CompactOrderItem,
  sessionItems: any[],
  usedIndices: Set<number>
): any | null {
  const cleanMetaId = metaItem.id.replace(/-bundle-\d+$/, '');
  const metaVariantNorm = metaItem.variant.trim().toLowerCase();

  // Pass 1: match exact id + variant (compare across both RO & EN localized names)
  for (let i = 0; i < sessionItems.length; i++) {
    if (usedIndices.has(i)) continue;
    const s = sessionItems[i];
    const sId = String(s?.id || s?.slug || '');
    const sVarRo = resolveLocalizedString(s?.selectedVariant?.name ?? s?.variant ?? '', 'ro').trim().toLowerCase();
    const sVarEn = resolveLocalizedString(s?.selectedVariant?.name ?? s?.variant ?? '', 'en').trim().toLowerCase();
    if (sId === metaItem.id && (!metaVariantNorm || sVarRo === metaVariantNorm || sVarEn === metaVariantNorm)) {
      usedIndices.add(i);
      return s;
    }
  }

  // Pass 2: match exact id or base UUID
  for (let i = 0; i < sessionItems.length; i++) {
    if (usedIndices.has(i)) continue;
    const s = sessionItems[i];
    const sId = String(s?.id || s?.slug || '').replace(/-bundle-\d+$/, '');
    if (sId === cleanMetaId) {
      usedIndices.add(i);
      return s;
    }
  }

  return null;
}

export interface BuiltOrderContext {
  orderData: OrderData;
  stripeReceiptNumber: string | null;
  stripeChargeId: string | null;
  isPreorderAtOrder: boolean;
}

/**
 * Reconstructs full `OrderData` from a Stripe `PaymentIntent` using the strict recovery cascade:
 * 1) Fresh PI (`latest_charge` expanded) -> receipt_number, charge_id, billing_details, receipt_email
 * 2) `pi.metadata` -> `checkout_sessions` (by payment_intent_id, then email fallback)
 * 3) Shipping & billing cascade: `pi.metadata` -> `checkout_sessions` -> `pi.shipping` -> `latest_charge.billing_details` -> `pi.receipt_email`
 */
export async function buildOrderDataFromStripePI(
  piInput: string | Stripe.PaymentIntent,
  assignedOrderId: string
): Promise<BuiltOrderContext> {
  const stripe = getStripeClient();
  const pi = await getExpandedPaymentIntent(piInput);
  const charge = await resolveExpandedCharge(pi, stripe);

  const meta = (pi.metadata || {}) as Record<string, string>;
  const locale: 'ro' | 'en' = meta.locale === 'en' ? 'en' : 'ro';

  // Extract charge receipt & billing info
  const stripeReceiptNumber = charge?.receipt_number ? String(charge.receipt_number).trim() : null;
  const stripeChargeId = charge?.id ? String(charge.id).trim() : null;
  const billing = charge?.billing_details;
  const shipping = pi.shipping;

  // Lookup checkout_sessions: first by payment_intent_id, then fallback by email
  let session: any = null;
  const { data: sessionByPi } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .eq('payment_intent_id', pi.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  session = sessionByPi || null;

  const candidateEmail = (
    meta.email ||
    session?.email ||
    pi.receipt_email ||
    charge?.receipt_email ||
    billing?.email ||
    ''
  ).trim().toLowerCase();

  if ((!session || !Array.isArray(session.items) || session.items.length === 0) && candidateEmail) {
    const cutoffIso = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: sessionByEmail } = await supabaseAdmin
      .from('checkout_sessions')
      .select('*')
      .ilike('email', candidateEmail.replace(/[%_]/g, ''))
      .neq('status', 'completed')
      .gte('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionByEmail) {
      session = session
        ? { ...sessionByEmail, ...session, items: (Array.isArray(session.items) && session.items.length > 0) ? session.items : sessionByEmail.items }
        : sessionByEmail;
    }
  }

  // Merge customer details in cascade
  const fullNameRaw = (
    meta.customer_name ||
    `${meta.firstName || ''} ${meta.lastName || ''}`.trim() ||
    `${session?.first_name || ''} ${session?.last_name || ''}`.trim() ||
    shipping?.name ||
    billing?.name ||
    ''
  ).trim();

  const nameParts = fullNameRaw ? fullNameRaw.split(/\s+/) : [];
  const firstName = (meta.firstName || session?.first_name || nameParts[0] || '[LIPSĂ NUME]').trim();
  const lastName = (
    meta.lastName ||
    session?.last_name ||
    (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '') ||
    (firstName.includes('[LIPSĂ') ? '' : 'Client')
  ).trim();

  const email = (
    meta.email ||
    session?.email ||
    pi.receipt_email ||
    charge?.receipt_email ||
    billing?.email ||
    '[LIPSĂ EMAIL]'
  ).trim();

  const phone = (
    meta.phone ||
    session?.phone ||
    shipping?.phone ||
    billing?.phone ||
    ''
  ).trim();

  const addrLine1 = (
    meta.addr_line1 ||
    session?.line1 ||
    shipping?.address?.line1 ||
    billing?.address?.line1 ||
    '[LIPSĂ ADRESĂ]'
  ).trim();

  const addrLine2 = (
    meta.addr_line2 ||
    session?.line2 ||
    shipping?.address?.line2 ||
    billing?.address?.line2 ||
    ''
  ).trim();

  const addrCity = (
    meta.addr_city ||
    session?.city ||
    shipping?.address?.city ||
    billing?.address?.city ||
    'Bucuresti'
  ).trim();

  const addrCounty = (
    meta.addr_county ||
    meta.addr_state ||
    session?.state ||
    shipping?.address?.state ||
    billing?.address?.state ||
    ''
  ).trim();

  const addrZip = (
    meta.addr_postal_code ||
    session?.postal_code ||
    shipping?.address?.postal_code ||
    billing?.address?.postal_code ||
    '000000'
  ).trim();

  const addrCountry = (
    meta.addr_country ||
    meta.country ||
    session?.country ||
    shipping?.address?.country ||
    billing?.address?.country ||
    'RO'
  ).trim().toUpperCase();

  // Monetary normalization
  const currency = (pi.currency || meta.currency || session?.currency || 'ron').toUpperCase();
  const multiplier = getCurrencyMultiplier(currency);
  const actualTotal = (pi.amount_received || pi.amount || 0) / multiplier;

  // Recover items in strict cascade: metadata + checkout_sessions full untruncated objects
  const metaItems = parseOrderItemsFromMetadata(meta);
  const sessionItems: any[] = Array.isArray(session?.items) ? session.items : [];

  let resolvedRawItems: any[] = [];
  if (metaItems.length > 0 && (sessionItems.length === 0 || metaItems.length >= sessionItems.length)) {
    const usedSessionIndices = new Set<number>();
    resolvedRawItems = metaItems.map((mi) => {
      const matched = matchSessionItem(mi, sessionItems, usedSessionIndices);
      const selectedVariant = matched?.selectedVariant || (mi.variant ? { name: mi.variant } : null);
      const itemName = resolveLocalizedString(matched?.name, locale) || mi.name || 'Produs';
      const price = Number(mi.price) > 0 ? Number(mi.price) : Number(matched?.price || 0);
      return {
        ...(matched || {}),
        id: matched?.id || mi.id,
        quantity: mi.quantity,
        price,
        name: itemName,
        variant: mi.variant || resolveLocalizedString(selectedVariant?.name, locale) || '',
        selectedVariant,
        image: matched?.image || selectedVariant?.image || undefined,
      };
    });
  } else if (sessionItems.length > 0) {
    // Metadata missing or truncated compared to untruncated checkout_sessions backup -> recover full cart
    resolvedRawItems = sessionItems.map((si) => {
      const matchedMeta = metaItems.find(
        (mi) => mi.id === si.id || mi.id.replace(/-bundle-\d+$/, '') === String(si.id).replace(/-bundle-\d+$/, '')
      );
      const variantName = resolveLocalizedString(si?.selectedVariant?.name ?? si?.variant, locale) || matchedMeta?.variant || '';
      return {
        ...si,
        id: si.id || matchedMeta?.id || 'unknown',
        quantity: Math.max(1, Number(si.quantity || matchedMeta?.quantity || 1)),
        price: Number(matchedMeta?.price) > 0 ? Number(matchedMeta!.price) : Number(si.price || 0),
        name: resolveLocalizedString(si.name, locale) || matchedMeta?.name || 'Produs',
        variant: variantName,
        selectedVariant: si.selectedVariant || (variantName ? { name: variantName } : null),
      };
    });
  }

  const enrichedItems = resolvedRawItems.map((item: any) => {
    const isDigital = isDigitalProgramItem(item);
    const isBundle =
      !isDigital &&
      (String(item.id || '').includes('-bundle-') ||
        /pachet|bundle/i.test(String(item.name || '')));
    const variantStr = resolveLocalizedString(item?.selectedVariant?.name ?? item?.variant, locale);
    const fallbackImg = isDigital
      ? '/images/products/program_complete_trio_v2.webp'
      : isBundle
        ? '/images/products/x10_elbow_wraps_purple.webp'
        : getSingleFlavorImage(variantStr || item.name);
    const resolvedImage = resolveItemImage({
      ...item,
      image: item.image || item.selectedVariant?.image || fallbackImg,
    });
    const finalVariantObj = item.selectedVariant
      ? { ...item.selectedVariant, image: item.selectedVariant.image || resolvedImage }
      : variantStr
        ? { name: variantStr, image: resolvedImage }
        : null;

    return {
      ...item,
      id: item.id,
      name: item.name,
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: Number(item.price || 0),
      image: resolvedImage,
      selectedVariant: finalVariantObj,
    };
  });

  // Determine preorder classification at order time
  const isPreorderAtOrder =
    meta.is_preorder === 'yes' ||
    enrichedItems.some((it: any) => {
      if (it?.stock_status === 'preorder' || it?.is_preorder === true) return true;
      if (it?.selectedVariant?.stock_status === 'preorder') return true;
      const vName = resolveLocalizedString(it?.selectedVariant?.name ?? it?.variant, locale).toLowerCase();
      return vName.includes('precomand') || vName.includes('pre-order') || vName.includes('preorder');
    });

  const shippingCost = Number.parseFloat(meta.shippingCost || '0') || 0;
  const bundleDiscount = Number.parseFloat(meta.bundleDiscount || '0') || 0;
  const couponDiscount = Number.parseFloat(meta.couponDiscount || '0') || 0;
  const cardDiscount = Number.parseFloat(meta.cardDiscount || '0') || 0;
  const parsedSubtotal = Number.parseFloat(meta.subtotal || '0');
  const subtotal = Number.isFinite(parsedSubtotal) && parsedSubtotal > 0 ? parsedSubtotal : actualTotal;
  const hasExplicitDiscounts = meta.bundleDiscount !== undefined || meta.couponDiscount !== undefined;
  const discount = hasExplicitDiscounts
    ? bundleDiscount + couponDiscount
    : (Number.parseFloat(meta.discount_total || '0') || 0);

  const couponIdRaw = meta.coupon_id && meta.coupon_id !== 'none' ? meta.coupon_id : null;
  const couponCodeRaw = (couponIdRaw || couponDiscount > 0) && meta.coupon && meta.coupon !== 'none' ? meta.coupon : undefined;

  const carrierIdRaw =
    meta.carrier_id && meta.carrier_id !== 'none'
      ? meta.carrier_id
      : session?.carrier_id || (addrCountry === 'RO' ? '7' : '106');
  const shippingTypeRaw =
    meta.shipping_type && meta.shipping_type !== 'none'
      ? meta.shipping_type
      : session?.shipping_type || 'hd';

  const orderData: OrderData = {
    id: assignedOrderId,
    date: new Date(pi.created ? pi.created * 1000 : Date.now()).toLocaleDateString(locale === 'en' ? 'en-US' : 'ro-RO'),
    currency,
    locale,
    total: actualTotal,
    subtotal,
    discount,
    cardDiscount,
    shipping: shippingCost,
    coupon_id: couponIdRaw || couponCodeRaw || null,
    couponCode: couponCodeRaw,
    paymentMethod: 'online',
    shippingType: shippingTypeRaw === 'pudo' ? 'pudo' : 'hd',
    carrierId: String(carrierIdRaw),
    branchId:
      meta.branch_id && meta.branch_id !== 'none'
        ? meta.branch_id
        : session?.branch_id || undefined,
    branchName:
      meta.branch_name && meta.branch_name !== 'none'
        ? meta.branch_name
        : session?.branch_name || undefined,
    paymentIntentId: pi.id,
    status: isPreorderAtOrder ? 'preorder' : 'processing',
    priorityProcessing: meta.priority_processing === 'yes',
    giftPackaging: meta.gift_packaging === 'yes',
    giftMessage: meta.gift_message || null,
    itemsAlreadyInCurrency: true,
    stripeReceiptNumber,
    stripeChargeId,
    isPreorderAtOrder,
    customer: {
      firstName,
      lastName,
      email,
      phone,
      addr_line1: addrLine1,
      addr_line2: addrLine2 || undefined,
      addr_city: addrCity,
      addr_county: addrCounty || undefined,
      addr_zip: addrZip,
      addr_country: addrCountry,
    },
    items: enrichedItems,
  };

  return {
    orderData,
    stripeReceiptNumber,
    stripeChargeId,
    isPreorderAtOrder,
  };
}

/**
 * Ensures a Stripe `PaymentIntent` (status === 'succeeded') is persisted cleanly in Supabase `orders`.
 * Guarantees:
 * - Single-Flight memory lock per `payment_intent_id`
 * - DB idempotency BEFORE allocating a new sequential order number
 * - Order number reuse when recovering an existing `failed` row
 * - Automatic backfill of `stripe_receipt_number`, `stripe_charge_id`, and empty items on existing orders
 * - Marking matching `checkout_sessions` as `completed`
 */
export async function ensureStripeOrderInDb(
  piOrId: string | Stripe.PaymentIntent
): Promise<EnsureStripeOrderResult> {
  const piId = typeof piOrId === 'string' ? piOrId : piOrId?.id;
  if (!piId || !piId.startsWith('pi_')) {
    throw new Error(`Invalid Stripe PaymentIntent identifier: ${piId}`);
  }

  const existingLock = inFlightSyncLocks.get(piId);
  if (existingLock) {
    console.log(`🔒 [STRIPE SYNC] Awaiting in-flight lock for ${piId}...`);
    return existingLock;
  }

  const runPromise = (async (): Promise<EnsureStripeOrderResult> => {
    const pi = await getExpandedPaymentIntent(piOrId);

    if (pi.status !== 'succeeded') {
      throw new Error(`PaymentIntent ${pi.id} has non-succeeded status: ${pi.status}`);
    }

    // 1. Check DB idempotency BEFORE allocating a new order number
    const { data: existingOrder, error: lookupErr } = await supabaseAdmin
      .from('orders')
      .select('id, payment_intent_id, status, receipt_url, carrier_metadata, items, customer_email')
      .eq('payment_intent_id', pi.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (lookupErr) {
      throw new Error(`DB idempotency lookup failed for ${pi.id}: ${lookupErr.message}`);
    }

    const charge = await resolveExpandedCharge(pi, getStripeClient());
    const receiptNum = charge?.receipt_number ? String(charge.receipt_number).trim() : null;
    const chargeId = charge?.id ? String(charge.id).trim() : null;

    if (existingOrder && existingOrder.status !== 'failed') {
      const canonicalExistingId = getCanonicalOrderNumber(existingOrder);
      const existingCarrierMeta = (existingOrder.carrier_metadata || {}) as Record<string, any>;
      const updates: Record<string, any> = {};
      const nextCarrierMeta: Record<string, any> = { ...existingCarrierMeta };
      let needsCarrierMetaUpdate = false;

      if (receiptNum && !existingCarrierMeta.stripe_receipt_number) {
        nextCarrierMeta.stripe_receipt_number = receiptNum;
        needsCarrierMetaUpdate = true;
      }
      if (chargeId && !existingCarrierMeta.stripe_charge_id) {
        nextCarrierMeta.stripe_charge_id = chargeId;
        needsCarrierMetaUpdate = true;
      }
      if (canonicalExistingId && !canonicalExistingId.startsWith('pi_') && !existingCarrierMeta.order_number) {
        nextCarrierMeta.order_number = canonicalExistingId;
        needsCarrierMetaUpdate = true;
      }

      const existingItemsEmpty = !Array.isArray(existingOrder.items) || existingOrder.items.length === 0;
      if (existingItemsEmpty) {
        const rebuilt = await buildOrderDataFromStripePI(pi, canonicalExistingId);
        if (rebuilt.orderData.items.length > 0) {
          updates.items = rebuilt.orderData.items;
        }
      }

      if (needsCarrierMetaUpdate) {
        updates.carrier_metadata = nextCarrierMeta;
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabaseAdmin
          .from('orders')
          .update(updates)
          .eq('id', existingOrder.id);
      }

      await markCheckoutSessionCompleted(pi.id, existingOrder.customer_email || pi.receipt_email);

      return {
        outcome: 'already_exists',
        orderId: canonicalExistingId,
        dbId: existingOrder.id,
        paymentIntentId: pi.id,
        stripeReceiptNumber: nextCarrierMeta.stripe_receipt_number || null,
        stripeChargeId: nextCarrierMeta.stripe_charge_id || null,
      };
    }

    // 2. Determine order number: reuse existing number if recovering a `failed` row; allocate only for new orders
    let assignedOrderId: string;
    const isRecovery = Boolean(existingOrder && existingOrder.status === 'failed');

    if (existingOrder) {
      const existingCanonical = getCanonicalOrderNumber(existingOrder);
      const hasValidOrderNum = /^(?:TZ|ODIN)-[A-Za-z0-9-]+$/i.test(existingCanonical);
      assignedOrderId = hasValidOrderNum ? existingCanonical : await getNextOrderNumber();
    } else {
      assignedOrderId = await getNextOrderNumber();
    }

    // 3. Build complete order context via cascade and persist + process post-order steps
    const { orderData, stripeReceiptNumber, stripeChargeId } = await buildOrderDataFromStripePI(
      pi,
      assignedOrderId
    );

    await processOrder(orderData);
    await markCheckoutSessionCompleted(pi.id, orderData.customer.email);

    return {
      outcome: isRecovery ? 'recovered' : 'created',
      orderId: assignedOrderId,
      dbId: existingOrder?.id,
      paymentIntentId: pi.id,
      stripeReceiptNumber,
      stripeChargeId,
    };
  })();

  inFlightSyncLocks.set(piId, runPromise);

  try {
    return await runPromise;
  } finally {
    if (inFlightSyncLocks.get(piId) === runPromise) {
      inFlightSyncLocks.delete(piId);
    }
  }
}

export interface ReconcileStripeResult {
  checked: number;
  imported: number;
  recovered: number;
  backfilled: number;
  alreadySynced: number;
  errors: Array<{ paymentIntentId: string; error: string }>;
}

/**
 * Reconciles recent succeeded Stripe PaymentIntents (older than 45 seconds) against Supabase `orders`:
 * - Imports any missing succeeded payments automatically
 * - Recovers `failed` placeholders
 * - Backfills `stripe_receipt_number` and `stripe_charge_id` on existing orders
 */
export async function reconcileRecentStripeOrders(options?: {
  daysBack?: number;
  limit?: number;
}): Promise<ReconcileStripeResult> {
  const result: ReconcileStripeResult = {
    checked: 0,
    imported: 0,
    recovered: 0,
    backfilled: 0,
    alreadySynced: 0,
    errors: [],
  };

  if (!isStripeConfigured()) {
    return result;
  }

  const stripe = getStripeClient();
  const daysBack = Math.max(1, Math.min(30, options?.daysBack ?? 14));
  const maxFetch = Math.max(10, Math.min(300, options?.limit ?? 100));
  const nowSec = Math.floor(Date.now() / 1000);
  const cutoffRecentSec = nowSec - 45; // Avoid racing in-flight webhook/redirect within 45s
  const cutoffOldSec = nowSec - daysBack * 24 * 60 * 60;

  const succeededIntents: Stripe.PaymentIntent[] = [];
  let startingAfter: string | undefined;

  while (succeededIntents.length < maxFetch) {
    const page = await stripe.paymentIntents.list({
      limit: Math.min(100, maxFetch - succeededIntents.length),
      created: { gte: cutoffOldSec, lte: cutoffRecentSec },
      expand: ['data.latest_charge'],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    for (const pi of page.data) {
      if (pi.status === 'succeeded' && pi.created <= cutoffRecentSec) {
        succeededIntents.push(pi);
      }
    }

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  result.checked = succeededIntents.length;
  if (succeededIntents.length === 0) {
    return result;
  }

  const piIds = succeededIntents.map((pi) => pi.id);
  const { data: dbOrders, error: dbErr } = await supabaseAdmin
    .from('orders')
    .select('id, payment_intent_id, status, carrier_metadata, items')
    .in('payment_intent_id', piIds);

  if (dbErr) {
    throw new Error(`Failed querying existing orders during Stripe reconcile: ${dbErr.message}`);
  }

  const dbByPi = new Map<string, any>();
  for (const ord of dbOrders || []) {
    if (ord.payment_intent_id && !dbByPi.has(ord.payment_intent_id)) {
      dbByPi.set(ord.payment_intent_id, ord);
    }
  }

  for (const pi of succeededIntents) {
    try {
      const existing = dbByPi.get(pi.id);
      const charge = typeof pi.latest_charge === 'object' ? (pi.latest_charge as Stripe.Charge) : null;
      const hasMissingReceipt = Boolean(
        existing &&
          charge?.receipt_number &&
          !existing.carrier_metadata?.stripe_receipt_number
      );
      const hasMissingChargeId = Boolean(
        existing &&
          charge?.id &&
          !existing.carrier_metadata?.stripe_charge_id
      );
      const hasEmptyItems = Boolean(
        existing && (!Array.isArray(existing.items) || existing.items.length === 0)
      );

      if (!existing || existing.status === 'failed' || hasMissingReceipt || hasMissingChargeId || hasEmptyItems) {
        const res = await ensureStripeOrderInDb(pi);
        if (res.outcome === 'created') result.imported++;
        else if (res.outcome === 'recovered') result.recovered++;
        else if (hasMissingReceipt || hasMissingChargeId || hasEmptyItems) result.backfilled++;
        else result.alreadySynced++;
      } else {
        result.alreadySynced++;
      }
    } catch (err: any) {
      result.errors.push({
        paymentIntentId: pi.id,
        error: err?.message || 'Unknown reconciliation error',
      });
    }
  }

  return result;
}

