"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { resend, logEmailToDb } from "@/lib/resend-service";
import { AbandonedCartEmail } from "@/components/email/AbandonedCartEmail";
import { getEmailTemplate } from "@/app/actions/email-templates";
import { getSiteUrl, getResendFromEmail } from "@/lib/site-config";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";
import {
  buildNormalizedAbandonedItems,
  executeAbandonedCartsRecovery,
  parseSessionItemsArray,
  resolveAbandonedCartLocale,
} from "@/lib/abandoned-carts-runner";

export interface AbandonedCartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  selectedVariant?: any;
}

export interface AbandonedCartCustomer {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  shippingType?: string | null;
  carrierId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
}

export interface FormattedAbandonedCart {
  id: string;
  paymentIntentId?: string | null;
  customer: AbandonedCartCustomer;
  items: AbandonedCartItem[];
  totalAmount: number;
  totalAmountRon: number;
  currency: string;
  status: 'abandoned' | 'active' | 'recovered' | 'completed';
  rawStatus: string;
  recoveryEmailsSent: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  recoveredByOrderId?: string | null;
  recoveredAt?: string | null;
  recoveryUrl: string;
}

export interface CurrencyBreakdownEntry {
  count: number;
  abandonedCount: number;
  recoveredCount: number;
  abandonedNative: number;
  abandonedRon: number;
  recoveredNative: number;
  recoveredRon: number;
}

export interface AbandonedCartsStats {
  totalCount: number;
  abandonedCount: number;
  activeCount: number;
  recoveredCount: number;
  completedCount: number;
  potentialLostRevenue: number;
  recoveredRevenue: number;
  recoveryRate: number;
  todayCount: number;
  currencyBreakdown?: Record<string, CurrencyBreakdownEntry>;
}

export interface AvailableRecoveryCoupon {
  id: string;
  code: string;
  type: string;
  value: number;
  description?: string;
}

export interface GetAbandonedCartsResult {
  carts: FormattedAbandonedCart[];
  stats: AbandonedCartsStats;
  availableCoupons: AvailableRecoveryCoupon[];
  default72hCoupon?: string;
}

function computeSessionTotalInRon(
  session: any,
  liveRates: Record<string, number>
): { sessionCurrency: string; nativeTotal: number; totalRon: number } {
  const sessionCurrency = String(session?.currency || 'RON').toUpperCase().trim() || 'RON';
  let nativeTotal = Number(session?.total_amount) || 0;
  if (nativeTotal === 0) {
    const itemsList = buildNormalizedAbandonedItems(session?.items, sessionCurrency, session?.total_amount, liveRates);
    nativeTotal = itemsList.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  }
  nativeTotal = Number(nativeTotal.toFixed(2));
  const totalRon = convertToRon(nativeTotal, sessionCurrency, liveRates);
  return { sessionCurrency, nativeTotal, totalRon };
}

/**
 * FETCH ALL ABANDONED CARTS & SESSIONS
 */
export async function getAdminAbandonedCarts(): Promise<GetAbandonedCartsResult> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  // 1. Fetch all checkout sessions
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .order('created_at', { ascending: false });

  if (sessionsError) {
    console.error("❌ [getAdminAbandonedCarts] Database error:", sessionsError);
    throw new Error("Eroare la încărcarea sesiunilor de checkout.");
  }

  const rawSessions = sessions || [];
  const liveRates = await getServerExchangeRates();

  // 2. Fetch completed/recent orders to detect recovered sessions
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_email, created_at, total_amount, currency, status')
    .neq('status', 'cancelled');

  const ordersByEmail = new Map<string, Array<{ id: string; createdAt: string; totalAmount: number; currency: string }>>();
  if (orders) {
    orders.forEach(o => {
      if (o.customer_email) {
        const emailClean = o.customer_email.trim().toLowerCase();
        if (!ordersByEmail.has(emailClean)) {
          ordersByEmail.set(emailClean, []);
        }
        ordersByEmail.get(emailClean)!.push({
          id: o.id,
          createdAt: o.created_at,
          totalAmount: Number(o.total_amount || 0),
          currency: String(o.currency || 'RON').toUpperCase().trim() || 'RON',
        });
      }
    });
  }

  const nowMs = Date.now();
  const ABANDON_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  let totalAbandoned = 0;
  let totalActive = 0;
  let totalRecovered = 0;
  let totalCompleted = 0;
  let potentialLostRev = 0;
  let recoveredRev = 0;
  let todayCount = 0;
  const currencyBreakdown: Record<string, CurrencyBreakdownEntry> = {};

  const formattedCarts: FormattedAbandonedCart[] = rawSessions.map(session => {
    const emailClean = (session.email || '').trim().toLowerCase();
    const sessionCreatedAt = new Date(session.created_at).getTime();
    const sessionUpdatedAt = new Date(session.updated_at || session.created_at).getTime();
    const sessionCurrency = String(session.currency || 'RON').toUpperCase().trim() || 'RON';

    const itemsList = buildNormalizedAbandonedItems(
      session.items,
      sessionCurrency,
      session.total_amount,
      liveRates
    );

    // Calculate total amount in session's native currency & convert to RON for unified stats
    let totalAmt = Number(session.total_amount) || 0;
    if (totalAmt === 0 && itemsList.length > 0) {
      totalAmt = itemsList.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    }
    totalAmt = Number(totalAmt.toFixed(2));
    const totalAmountRon = convertToRon(totalAmt, sessionCurrency, liveRates);

    if (!currencyBreakdown[sessionCurrency]) {
      currencyBreakdown[sessionCurrency] = {
        count: 0,
        abandonedCount: 0,
        recoveredCount: 0,
        abandonedNative: 0,
        abandonedRon: 0,
        recoveredNative: 0,
        recoveredRon: 0,
      };
    }
    const currStats = currencyBreakdown[sessionCurrency];
    currStats.count += 1;

    // Determine status
    let effectiveStatus: 'abandoned' | 'active' | 'recovered' | 'completed' = 'abandoned';
    let recoveredByOrderId: string | null = null;
    let recoveredAt: string | null = null;

    if (session.status === 'completed') {
      effectiveStatus = 'completed';
      totalCompleted++;
    } else if (session.status === 'recovered') {
      effectiveStatus = 'recovered';
      totalRecovered++;
      recoveredRev += totalAmountRon;
      currStats.recoveredCount += 1;
      currStats.recoveredNative = Number((currStats.recoveredNative + totalAmt).toFixed(2));
      currStats.recoveredRon = Number((currStats.recoveredRon + totalAmountRon).toFixed(2));
    } else {
      // Check if user made a purchase after starting this checkout session
      const userOrders = emailClean ? ordersByEmail.get(emailClean) : null;
      const orderAfterSession = userOrders?.find(o => new Date(o.createdAt).getTime() >= sessionCreatedAt - 60000); // 1 min buffer

      if (orderAfterSession) {
        effectiveStatus = 'recovered';
        recoveredByOrderId = orderAfterSession.id;
        recoveredAt = orderAfterSession.createdAt;
        totalRecovered++;
        recoveredRev += totalAmountRon;
        currStats.recoveredCount += 1;
        currStats.recoveredNative = Number((currStats.recoveredNative + totalAmt).toFixed(2));
        currStats.recoveredRon = Number((currStats.recoveredRon + totalAmountRon).toFixed(2));
      } else {
        const timeSinceUpdate = nowMs - sessionUpdatedAt;
        if (timeSinceUpdate <= ABANDON_TIMEOUT_MS) {
          effectiveStatus = 'active';
          totalActive++;
        } else {
          effectiveStatus = 'abandoned';
          totalAbandoned++;
          potentialLostRev += totalAmountRon;
          currStats.abandonedCount += 1;
          currStats.abandonedNative = Number((currStats.abandonedNative + totalAmt).toFixed(2));
          currStats.abandonedRon = Number((currStats.abandonedRon + totalAmountRon).toFixed(2));
        }
      }
    }

    if (sessionCreatedAt >= todayStartMs) {
      todayCount++;
    }

    const firstName = (session.first_name || '').trim();
    const lastName = (session.last_name || '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Client Anonim';

    return {
      id: session.id,
      paymentIntentId: session.payment_intent_id || null,
      customer: {
        fullName,
        firstName,
        lastName,
        email: session.email || '',
        phone: session.phone || '',
        line1: session.line1 || '',
        line2: session.line2 || null,
        city: session.city || '',
        state: session.state || null,
        postalCode: session.postal_code || '',
        country: session.country || 'RO',
        shippingType: session.shipping_type || null,
        carrierId: session.carrier_id || null,
        branchId: session.branch_id || null,
        branchName: session.branch_name || null
      },
      items: itemsList,
      totalAmount: totalAmt,
      totalAmountRon,
      currency: sessionCurrency,
      status: effectiveStatus,
      rawStatus: session.status || 'initiated',
      recoveryEmailsSent: session.recovery_emails_sent || {},
      createdAt: session.created_at,
      updatedAt: session.updated_at || session.created_at,
      recoveredByOrderId,
      recoveredAt,
      recoveryUrl: `${getSiteUrl()}/${(session.country === 'RO' || !session.country) ? 'ro' : 'en'}/checkout`
    };
  });

  const totalPotentiallyRecoverable = totalAbandoned + totalRecovered;
  const recoveryRate = totalPotentiallyRecoverable > 0 
    ? Number(((totalRecovered / totalPotentiallyRecoverable) * 100).toFixed(1))
    : 0;

  // 3. Fetch active available coupons for the popup selection
  const { data: dbCoupons } = await supabaseAdmin
    .from('coupons')
    .select('id, code, type, value, description, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  const activeCoupons: AvailableRecoveryCoupon[] = (dbCoupons || [])
    .filter(c => !c.code.startsWith('SCRATCH-'))
    .map(c => ({
      id: c.id,
      code: c.code,
      type: c.type || 'percentage',
      value: Number(c.value) || 0,
      description: c.description || undefined
    }));

  // 4. Fetch default 72h coupon from store_settings
  const { data: setting72h } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', 'abandoned_72h_coupon')
    .maybeSingle();

  const default72hCoupon = (typeof setting72h?.value === 'string' ? setting72h.value : 'TREN10') || 'TREN10';

  return {
    carts: formattedCarts,
    stats: {
      totalCount: rawSessions.length,
      abandonedCount: totalAbandoned,
      activeCount: totalActive,
      recoveredCount: totalRecovered,
      completedCount: totalCompleted,
      potentialLostRevenue: Number(potentialLostRev.toFixed(2)),
      recoveredRevenue: Number(recoveredRev.toFixed(2)),
      recoveryRate,
      todayCount,
      currencyBreakdown,
    },
    availableCoupons: activeCoupons,
    default72hCoupon
  };
}

/**
 * UPDATE DEFAULT 72H RECOVERY COUPON (STORE SETTINGS)
 * Allows admin to select which active coupon is used for automatic 72h / 3-day recovery
 */
export async function updateAbandoned72hDefaultCoupon(couponCode: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  const cleanCode = couponCode.trim().toUpperCase();
  if (!cleanCode) {
    throw new Error("Codul cuponului nu poate fi gol.");
  }

  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({
      key: 'abandoned_72h_coupon',
      value: cleanCode
    });

  if (error) {
    console.error("❌ [updateAbandoned72hDefaultCoupon] DB Error:", error);
    throw new Error(`Eroare la actualizarea cuponului: ${error.message}`);
  }

  return {
    success: true,
    message: `Cuponul default pentru automatizarea la 3 zile (72h) a fost actualizat la "${cleanCode}".`,
    default72hCoupon: cleanCode
  };
}

/**
 * SEND MANUAL RECOVERY EMAIL TO AN ABANDONED CART
 * Supports custom coupon code & discount percentage selected in popup modal
 */
export async function sendManualRecoveryEmail(
  sessionId: string, 
  templateType: '24h' | '72h',
  customOptions?: {
    couponCode?: string;
    couponValue?: number;
    customSubject?: string;
  }
) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  // 1. Fetch session
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    throw new Error("Sesiunea de coș nu a fost găsită.");
  }

  if (!session.email) {
    throw new Error("Acest coș nu are specificată o adresă de email.");
  }

  const emailClean = session.email.toLowerCase().trim();

  // 2. Check if unsubscribed
  const { data: unsubData } = await supabaseAdmin
    .from('unsubscribed_emails')
    .select('marketing')
    .eq('email', emailClean)
    .maybeSingle();

  if (unsubData && unsubData.marketing === false) {
    throw new Error("Utilizatorul s-a dezabonat de la email-urile promoționale.");
  }

  // 3. Load template
  const templateKey = templateType === '72h' ? 'abandoned_72h' : 'abandoned_24h';
  const template = await getEmailTemplate(templateKey);

  // 4. Resolve coupon code and value dynamically
  let couponCode: string | undefined;
  let couponValue: number | undefined;

  if (customOptions?.couponCode) {
    const cleanCode = customOptions.couponCode.toUpperCase().trim();
    const cleanVal = Number(customOptions.couponValue) || 10;

    // Ensure coupon exists in database so customer can use it at checkout
    const { data: existingCoupon } = await supabaseAdmin
      .from('coupons')
      .select('id, value')
      .eq('code', cleanCode)
      .maybeSingle();

    if (!existingCoupon) {
      await supabaseAdmin.from('coupons').insert({
        code: cleanCode,
        type: 'percentage',
        value: cleanVal,
        is_active: true,
        usage_limit: null,
        used_count: 0,
        description: `Cupon recuperare coș pentru ${session.email}`
      });
      couponValue = cleanVal;
    } else {
      couponValue = Number(existingCoupon.value) || cleanVal;
    }
    couponCode = cleanCode;
  } else if (templateType === '72h') {
    const { data: setting72h } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'abandoned_72h_coupon')
      .single();

    couponCode = setting72h?.value || 'TREN10';
    const { data: couponData } = await supabaseAdmin
      .from('coupons')
      .select('value')
      .eq('code', couponCode)
      .single();

    couponValue = couponData?.value || 10;
  }

  const locale = resolveAbandonedCartLocale(session);
  const customerName = String(session.first_name || '').trim();
  const firstName = customerName ? customerName.split(/\s+/)[0] : '';

  const defaultSubject = locale === 'en'
    ? (couponCode ? `Here is your ${couponValue}% discount for your cart!` : "You left items in your TrenZone cart")
    : (couponCode ? `Ai ${couponValue}% reducere pentru produsele din coș!` : "Ai lăsat produse în coșul tău TrenZone");

  const rawSubject = customOptions?.customSubject || (couponCode
    ? defaultSubject
    : (template ? (locale === 'en' ? template.subject_en : template.subject_ro) : defaultSubject));

  const finalSubject = (rawSubject || defaultSubject)
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{coupon\}\}/g, couponCode || '')
    .replace(/\{\{value\}\}/g, String(couponValue || ''))
    .replace(/,\s*([.!?])/g, '$1')
    .replace(/\s+,/g, ',')
    .trim();

  const siteUrl = getSiteUrl();
  const cartCheckoutUrl = `${siteUrl}/${locale}/checkout${couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : ''}`;
  const sessionCurrency = String(session.currency || (locale === 'ro' ? 'RON' : 'EUR')).toUpperCase().trim() || 'RON';
  const liveRates = await getServerExchangeRates().catch(() => undefined);
  const normalizedItems = buildNormalizedAbandonedItems(session.items, sessionCurrency, session.total_amount, liveRates);

  // 5. Send via Resend
  const emailPayload = {
    from: getResendFromEmail(),
    to: emailClean,
    subject: finalSubject,
    react: AbandonedCartEmail({
      customerName,
      items: normalizedItems,
      locale: locale as 'ro' | 'en',
      baseUrl: siteUrl,
      currency: sessionCurrency,
      cartUrl: cartCheckoutUrl,
      templateData: template as any,
      userEmail: emailClean,
      couponCode,
      couponValue
    }) as any
  };

  const resendResult = await resend.emails.send(emailPayload);
  if (resendResult.error) {
    const errMsg = resendResult.error.message || 'Necunoscută';
    console.error("❌ [sendManualRecoveryEmail] Resend error:", resendResult.error);
    await logEmailToDb(emailClean, finalSubject, `abandoned-${templateType}`, 'failed', errMsg, { sessionId, manual: true });
    throw new Error(`Eroare la trimiterea emailului: ${errMsg}`);
  }

  await logEmailToDb(emailClean, finalSubject, `abandoned-${templateType}`, 'sent', null, { sessionId, couponCode: couponCode || null, manual: true });

  // 6. Update recovery_emails_sent in DB
  const existingSent = session.recovery_emails_sent || {};
  const updatedSent = {
    ...existingSent,
    [templateType]: true,
    [`${templateType}_sent_at`]: new Date().toISOString(),
    last_coupon_code: couponCode || null,
    last_coupon_value: couponValue || null,
    manual: true
  };

  await supabaseAdmin
    .from('checkout_sessions')
    .update({ recovery_emails_sent: updatedSent })
    .eq('id', sessionId);

  return {
    success: true,
    message: couponCode 
      ? `Emailul cu cuponul ${couponCode} (${couponValue}% reducere) a fost trimis cu succes către ${emailClean}!`
      : `Emailul de reamintire (24h) a fost trimis cu succes către ${emailClean}!`
  };
}

/**
 * RUN AUTOMATED ABANDONED CARTS RECOVERY (ADMIN ON-DEMAND OR BACKGROUND)
 * Checks sessions:
 * - 24h reminder for sessions older than 24h (< 72h)
 * - 72h reminder with 10% discount for sessions older than 72h
 */
export async function runAbandonedCartsAutomation() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  return executeAbandonedCartsRecovery();
}

/**
 * UPDATE STATUS OF AN ABANDONED CART
 */
export async function updateAbandonedCartStatus(sessionId: string, newStatus: 'initiated' | 'recovered' | 'completed') {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  const { error } = await supabaseAdmin
    .from('checkout_sessions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Eroare la actualizarea statusului: ${error.message}`);
  }

  return { success: true };
}

/**
 * DELETE ABANDONED CART SESSION
 */
export async function deleteAbandonedCartSession(sessionId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  const { error } = await supabaseAdmin
    .from('checkout_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Eroare la ștergerea sesiunii: ${error.message}`);
  }

  return { success: true };
}

export interface TrancheRecipient {
  email: string;
  name: string;
  phone: string;
  totalAmount: number;
  oldestDate: string;
  sent: boolean;
  sentAt?: string;
  sessionsCount: number;
}

export interface TranchesStatusResult {
  totalUnique: number;
  tranche1: {
    totalCount: number;
    sentCount: number;
    remainingCount: number;
    totalAmount: number;
    dateRange: string;
    recipients: TrancheRecipient[];
  };
  tranche2: {
    totalCount: number;
    sentCount: number;
    remainingCount: number;
    totalAmount: number;
    dateRange: string;
    recipients: TrancheRecipient[];
  };
}

/**
 * GET DETAILED TRANCHES STATUS (TRANCHE 1 & TRANCHE 2)
 * Strictly deduplicates by email, verifies orders and unsubscribes.
 */
export async function getTranchesStatus(): Promise<TranchesStatusResult> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  const { data: sessions } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .order('created_at', { ascending: true });

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_email, created_at, status')
    .neq('status', 'cancelled');

  const ordersByEmail = new Map<string, any[]>();
  orders?.forEach(o => {
    if (o.customer_email) {
      const em = o.customer_email.trim().toLowerCase();
      if (!ordersByEmail.has(em)) ordersByEmail.set(em, []);
      ordersByEmail.get(em)!.push(o);
    }
  });

  const { data: unsubscribed } = await supabaseAdmin
    .from('unsubscribed_emails')
    .select('email, marketing');
  const unsubSet = new Set((unsubscribed || []).filter(u => u.marketing === false).map(u => u.email.toLowerCase().trim()));

  const liveRates = await getServerExchangeRates();
  const nowMs = Date.now();
  const ABANDON_TIMEOUT_MS = 30 * 60 * 1000;
  const uniqueMap = new Map<string, any>();

  for (const s of (sessions || [])) {
    if (!s.email || !s.email.trim()) continue;
    const email = s.email.trim().toLowerCase();
    if (unsubSet.has(email)) continue;
    if (s.status === 'completed' || s.status === 'recovered') continue;

    const sCreatedAt = new Date(s.created_at).getTime();
    const userOrders = ordersByEmail.get(email);
    const orderAfter = userOrders?.find(o => new Date(o.created_at).getTime() >= sCreatedAt - 60000);
    if (orderAfter) continue;

    const sUpdatedAt = new Date(s.updated_at || s.created_at).getTime();
    if (nowMs - sUpdatedAt <= ABANDON_TIMEOUT_MS) continue;

    const { totalRon: amt } = computeSessionTotalInRon(s, liveRates);

    const has72hSent = !!(s.recovery_emails_sent?.['72h']);
    const sentAt = s.recovery_emails_sent?.['72h_sent_at'];

    if (!uniqueMap.has(email)) {
      uniqueMap.set(email, {
        email,
        name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Client',
        phone: s.phone || '',
        sessionsCount: 1,
        latestSession: s,
        totalAmount: amt,
        oldestDate: s.created_at,
        newestDate: s.created_at,
        sent: has72hSent,
        sentAt
      });
    } else {
      const item = uniqueMap.get(email);
      item.sessionsCount++;
      item.totalAmount += amt;
      if (has72hSent) {
        item.sent = true;
        item.sentAt = sentAt || item.sentAt;
      }
      if (new Date(s.created_at) > new Date(item.newestDate)) {
        item.newestDate = s.created_at;
        item.latestSession = s;
        if (s.first_name || s.last_name) {
          item.name = [s.first_name, s.last_name].filter(Boolean).join(' ');
        }
      }
    }
  }

  const all = Array.from(uniqueMap.values());
  all.sort((a, b) => new Date(a.oldestDate).getTime() - new Date(b.oldestDate).getTime());

  const half = Math.ceil(all.length / 2);
  const t1 = all.slice(0, half);
  const t2 = all.slice(half);

  const formatTranche = (items: any[]) => {
    const totalCount = items.length;
    const sentCount = items.filter(i => i.sent).length;
    const remainingCount = totalCount - sentCount;
    const totalAmount = Number(items.reduce((acc, i) => acc + i.totalAmount, 0).toFixed(2));
    const dateRange = items.length > 0 
      ? `${new Date(items[0].oldestDate).toLocaleDateString('ro-RO')} - ${new Date(items[items.length - 1].oldestDate).toLocaleDateString('ro-RO')}`
      : '-';

    const recipients: TrancheRecipient[] = items.map(i => ({
      email: i.email,
      name: i.name,
      phone: i.phone,
      totalAmount: Number(i.totalAmount.toFixed(2)),
      oldestDate: i.oldestDate,
      sent: i.sent,
      sentAt: i.sentAt,
      sessionsCount: i.sessionsCount
    }));

    return { totalCount, sentCount, remainingCount, totalAmount, dateRange, recipients };
  };

  return {
    totalUnique: all.length,
    tranche1: formatTranche(t1),
    tranche2: formatTranche(t2)
  };
}

/**
 * SEND ABANDONED CART TRANCHE (1 OR 2)
 * Strictly deduplicates recipients and sends 10% discount email with TREN10.
 * Updates all sessions of the recipient in DB to prevent duplicates.
 */
export async function sendAbandonedCartTranche(trancheNumber: 1 | 2) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error("Acces neautorizat.");
  }

  // 1. Fetch default 72h coupon from store_settings
  const { data: setting72h } = await supabaseAdmin
    .from('store_settings')
    .select('value')
    .eq('key', 'abandoned_72h_coupon')
    .maybeSingle();

  const couponCode = (setting72h?.value || 'TREN10').toUpperCase().trim();
  const { data: couponData } = await supabaseAdmin
    .from('coupons')
    .select('value')
    .eq('code', couponCode)
    .maybeSingle();
  const couponValue = couponData?.value || 10;

  // 2. Load email template
  const template = await getEmailTemplate('abandoned_72h');

  // 3. Fetch all checkout sessions
  const { data: sessions } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .order('created_at', { ascending: true });

  // 4. Fetch orders to filter out recovered customers
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_email, created_at, status')
    .neq('status', 'cancelled');

  const ordersByEmail = new Map<string, any[]>();
  orders?.forEach(o => {
    if (o.customer_email) {
      const em = o.customer_email.trim().toLowerCase();
      if (!ordersByEmail.has(em)) ordersByEmail.set(em, []);
      ordersByEmail.get(em)!.push(o);
    }
  });

  // 5. Unsubscribed
  const { data: unsubscribed } = await supabaseAdmin
    .from('unsubscribed_emails')
    .select('email, marketing');
  const unsubSet = new Set((unsubscribed || []).filter(u => u.marketing === false).map(u => u.email.toLowerCase().trim()));

  const liveRates = await getServerExchangeRates();
  const nowMs = Date.now();
  const ABANDON_TIMEOUT_MS = 30 * 60 * 1000;
  const uniqueMap = new Map<string, any>();

  for (const s of (sessions || [])) {
    if (!s.email || !s.email.trim()) continue;
    const email = s.email.trim().toLowerCase();
    if (unsubSet.has(email)) continue;
    if (s.status === 'completed' || s.status === 'recovered') continue;

    const sCreatedAt = new Date(s.created_at).getTime();
    const userOrders = ordersByEmail.get(email);
    const orderAfter = userOrders?.find(o => new Date(o.created_at).getTime() >= sCreatedAt - 60000);
    if (orderAfter) continue;

    const sUpdatedAt = new Date(s.updated_at || s.created_at).getTime();
    if (nowMs - sUpdatedAt <= ABANDON_TIMEOUT_MS) continue;

    const has72hSent = !!(s.recovery_emails_sent?.['72h']);

    const { totalRon: amt } = computeSessionTotalInRon(s, liveRates);

    if (!uniqueMap.has(email)) {
      uniqueMap.set(email, {
        email,
        name: [s.first_name, s.last_name].filter(Boolean).join(' ') || 'Client',
        phone: s.phone || '',
        sessionsCount: 1,
        latestSession: s,
        totalAmount: amt,
        oldestDate: s.created_at,
        newestDate: s.created_at,
        country: s.country || 'RO',
        sent: has72hSent
      });
    } else {
      const item = uniqueMap.get(email);
      item.sessionsCount++;
      item.totalAmount += amt;
      if (has72hSent) item.sent = true;
      if (new Date(s.created_at) > new Date(item.newestDate)) {
        item.newestDate = s.created_at;
        item.latestSession = s;
        if (s.first_name || s.last_name) {
          item.name = [s.first_name, s.last_name].filter(Boolean).join(' ');
        }
      }
    }
  }

  const all = Array.from(uniqueMap.values());
  all.sort((a, b) => new Date(a.oldestDate).getTime() - new Date(b.oldestDate).getTime());

  const half = Math.ceil(all.length / 2);
  const targetBatch = (trancheNumber === 1 ? all.slice(0, half) : all.slice(half)).filter(p => !p.sent);

  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  for (const person of targetBatch) {
    const s = person.latestSession;
    const email = person.email;
    const locale = (person.country === 'RO' || !person.country) ? 'ro' : 'en';

    const customerFirstName = person.name.split(' ')[0] || (locale === 'en' ? 'Friend' : 'Prieten');
    const defaultSubject = locale === 'en'
      ? `Here is your ${couponValue}% discount for your cart!`
      : `Ai ${couponValue}% reducere pentru produsele din coș!`;

    const rawSubject = template ? (locale === 'en' ? template.subject_en : template.subject_ro) : defaultSubject;
    const finalSubject = (rawSubject || defaultSubject)
      .replace('{{name}}', customerFirstName)
      .replace('{{coupon}}', couponCode)
      .replace('{{value}}', String(couponValue));

    const siteUrl = getSiteUrl();
    const cartCheckoutUrl = `${siteUrl}/${locale}/checkout?coupon=${encodeURIComponent(couponCode)}`;
    const sessionCurrency = String((s as any).currency || (locale === 'ro' ? 'RON' : 'EUR')).toUpperCase().trim() || 'RON';
    const normalizedItems = buildNormalizedAbandonedItems(s.items, sessionCurrency, (s as any).total_amount, liveRates);

    try {
      const resendResult = await resend.emails.send({
        from: getResendFromEmail(),
        to: email,
        subject: finalSubject,
        react: AbandonedCartEmail({
          customerName: person.name,
          items: normalizedItems,
          locale: locale as 'ro' | 'en',
          baseUrl: siteUrl,
          currency: sessionCurrency,
          cartUrl: cartCheckoutUrl,
          templateData: template as any,
          userEmail: email,
          couponCode,
          couponValue
        }) as any
      });

      if (resendResult.error) {
        throw new Error(resendResult.error.message || 'Resend error');
      }

      // Mark ALL initiated sessions of this person in DB so they will never receive another email, preserving existing tracking keys
      const existingRecovery = (typeof s.recovery_emails_sent === 'object' && s.recovery_emails_sent !== null)
        ? s.recovery_emails_sent
        : {};
      await supabaseAdmin
        .from('checkout_sessions')
        .update({
          recovery_emails_sent: {
            ...existingRecovery,
            '72h': true,
            '72h_sent_at': new Date().toISOString(),
            last_coupon_code: couponCode,
            last_coupon_value: couponValue,
            tranche: trancheNumber
          }
        })
        .eq('email', email)
        .eq('status', 'initiated');

      sentCount++;

      // Throttle 600ms between sends
      await new Promise(r => setTimeout(r, 600));
    } catch (err: any) {
      console.error(`Eroare la trimiterea către ${email}:`, err);
      failedCount++;
      errors.push(`${email}: ${err.message}`);
    }
  }

  return {
    success: true,
    tranche: trancheNumber,
    totalTargeted: targetBatch.length,
    sentCount,
    failedCount,
    couponUsed: couponCode,
    errors: errors.slice(0, 5),
    message: `Tranșa ${trancheNumber} a fost procesată: ${sentCount} emailuri trimise cu succes cu cuponul ${couponCode} (-${couponValue}% reducere).`
  };
}

