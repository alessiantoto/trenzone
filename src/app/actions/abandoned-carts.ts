"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { resend } from "@/lib/resend-service";
import { AbandonedCartEmail } from "@/components/email/AbandonedCartEmail";
import { getEmailTemplate } from "@/app/actions/email-templates";

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

  // 2. Fetch completed/recent orders to detect recovered sessions
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, customer_email, created_at, total_amount, currency, status')
    .neq('status', 'cancelled');

  const ordersByEmail = new Map<string, Array<{ id: string; createdAt: string; totalAmount: number }>>();
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
          totalAmount: Number(o.total_amount || 0)
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

  const formattedCarts: FormattedAbandonedCart[] = rawSessions.map(session => {
    const emailClean = (session.email || '').trim().toLowerCase();
    const sessionCreatedAt = new Date(session.created_at).getTime();
    const sessionUpdatedAt = new Date(session.updated_at || session.created_at).getTime();

    // Parse items safely
    let itemsList: AbandonedCartItem[] = [];
    if (Array.isArray(session.items)) {
      itemsList = session.items.map((item: any, idx: number) => {
        let priceNum = 0;
        if (typeof item.price === 'number') {
          priceNum = item.price;
        } else if (item.price && typeof item.price === 'object') {
          priceNum = Number(item.price.RON || item.price.EUR || Object.values(item.price)[0] || 0);
        } else {
          priceNum = parseFloat(String(item.price || 0)) || 0;
        }

        return {
          id: String(item.id || `item-${idx}`),
          name: typeof item.name === 'object' ? (item.name.ro || item.name.en || 'Produs') : String(item.name || 'Produs'),
          quantity: Number(item.quantity) || 1,
          price: priceNum,
          image: item.image || item.selectedVariant?.image || undefined,
          selectedVariant: item.selectedVariant || null
        };
      });
    }

    // Calculate total amount
    let totalAmt = Number(session.total_amount) || 0;
    if (totalAmt === 0 && itemsList.length > 0) {
      totalAmt = itemsList.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    }
    totalAmt = Number(totalAmt.toFixed(2));

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
      recoveredRev += totalAmt;
    } else {
      // Check if user made a purchase after starting this checkout session
      const userOrders = emailClean ? ordersByEmail.get(emailClean) : null;
      const orderAfterSession = userOrders?.find(o => new Date(o.createdAt).getTime() >= sessionCreatedAt - 60000); // 1 min buffer

      if (orderAfterSession) {
        effectiveStatus = 'recovered';
        recoveredByOrderId = orderAfterSession.id;
        recoveredAt = orderAfterSession.createdAt;
        totalRecovered++;
        recoveredRev += totalAmt;
      } else {
        const timeSinceUpdate = nowMs - sessionUpdatedAt;
        if (timeSinceUpdate <= ABANDON_TIMEOUT_MS) {
          effectiveStatus = 'active';
          totalActive++;
        } else {
          effectiveStatus = 'abandoned';
          totalAbandoned++;
          potentialLostRev += totalAmt;
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
      currency: session.currency || 'RON',
      status: effectiveStatus,
      rawStatus: session.status || 'initiated',
      recoveryEmailsSent: session.recovery_emails_sent || {},
      createdAt: session.created_at,
      updatedAt: session.updated_at || session.created_at,
      recoveredByOrderId,
      recoveredAt,
      recoveryUrl: `https://www.trenzone.fit/${(session.country === 'RO' || !session.country) ? 'ro' : 'en'}/checkout`
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
      todayCount
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

  const locale = (session.country === 'RO' || !session.country) ? 'ro' : 'en';
  const customerName = session.first_name || (locale === 'en' ? 'Friend' : 'Prieten');
  
  const defaultSubject = locale === 'en'
    ? (couponCode ? `Here is your ${couponValue}% discount for your cart!` : "Did you forget something in your cart?")
    : (couponCode ? `Ai ${couponValue}% reducere pentru produsele din coș!` : "Ți-ai uitat produsele în coș!");

  const rawSubject = customOptions?.customSubject || (couponCode
    ? defaultSubject
    : (template ? (locale === 'en' ? template.subject_en : template.subject_ro) : defaultSubject));

  const finalSubject = (rawSubject || defaultSubject)
    .replace('{{name}}', customerName.split(' ')[0])
    .replace('{{coupon}}', couponCode || '')
    .replace('{{value}}', String(couponValue || ''));

  // Parse items safely
  let parsedSessionItems = session.items || [];
  if (typeof parsedSessionItems === 'string') {
    try {
      parsedSessionItems = JSON.parse(parsedSessionItems);
    } catch {
      parsedSessionItems = [];
    }
  }
  if (!Array.isArray(parsedSessionItems)) parsedSessionItems = [];

  const cartCheckoutUrl = `https://www.trenzone.fit/${locale}/checkout${couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : ''}`;

  // 5. Send via Resend
  const emailPayload = {
    from: 'TrenZone <contact@trenzone.fit>',
    to: emailClean,
    subject: finalSubject,
    react: AbandonedCartEmail({
      customerName,
      items: parsedSessionItems,
      locale: locale as 'ro' | 'en',
      cartUrl: cartCheckoutUrl,
      templateData: template as any,
      userEmail: emailClean,
      couponCode,
      couponValue
    }) as any
  };

  const resendResult = await resend.emails.send(emailPayload);
  if (resendResult.error) {
    console.error("❌ [sendManualRecoveryEmail] Resend error:", resendResult.error);
    throw new Error(`Eroare la trimiterea emailului: ${resendResult.error.message || 'Necunoscută'}`);
  }

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

  const now = new Date();
  // Window: from 120h (5 days) ago up to 24h ago (ensuring a full 24h buffer for recent shoppers)
  const lowerBound = new Date(now.getTime() - (120 * 60 * 60 * 1000));
  const upperBound = new Date(now.getTime() - (24 * 60 * 60 * 1000));

  const { data: sessions, error } = await supabaseAdmin
    .from('checkout_sessions')
    .select('*')
    .eq('status', 'initiated')
    .gte('created_at', lowerBound.toISOString())
    .lte('created_at', upperBound.toISOString());

  if (error) throw error;
  if (!sessions || sessions.length === 0) {
    return {
      success: true,
      processed: 0,
      emailsSent: 0,
      emailsSent24h: 0,
      emailsSent72h: 0,
      message: "Nu există coșuri abandonate eligibile în fereastra de 24h - 120h."
    };
  }

  let emailsSent = 0;
  let emailsSent24h = 0;
  let emailsSent72h = 0;

  const template24h = await getEmailTemplate('abandoned_24h');
  const template72h = await getEmailTemplate('abandoned_72h');

  const { data: setting72h } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'abandoned_72h_coupon').single();
  const couponCode72h = setting72h?.value || 'TREN10';
  const { data: couponData72h } = await supabaseAdmin.from('coupons').select('value').eq('code', couponCode72h).single();
  const couponValue72h = couponData72h?.value || 10;

  for (const session of sessions) {
    if (!session.email) continue;
    const emailObj = session.email.toLowerCase().trim();

    // 1. Check unsubscribed
    const { data: unsubData } = await supabaseAdmin
      .from('unsubscribed_emails')
      .select('marketing')
      .eq('email', emailObj)
      .maybeSingle();

    if (unsubData && unsubData.marketing === false) {
      continue;
    }

    // 2. Check if user already placed an order after session creation
    const { data: recentOrder } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('customer_email', emailObj)
      .gte('created_at', session.created_at)
      .limit(1);

    if (recentOrder && recentOrder.length > 0) {
      await supabaseAdmin.from('checkout_sessions').update({ status: 'recovered' }).eq('id', session.id);
      continue;
    }

    // 3. Determine email type based on last interaction time
    const sessionDate = new Date(session.updated_at || session.created_at);
    const hoursSince = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
    const recoveryEmailsSent = session.recovery_emails_sent || {};

    let templateToUse = null;
    let emailType = '';

    if (hoursSince >= 72 && !recoveryEmailsSent['72h']) {
      templateToUse = template72h;
      emailType = '72h';
    } else if (hoursSince >= 24 && hoursSince < 72 && !recoveryEmailsSent['24h']) {
      templateToUse = template24h;
      emailType = '24h';
    }

    if (!templateToUse || !emailType) continue;

    const locale = (session.country === 'RO' || !session.country) ? 'ro' : 'en';
    const customerName = session.first_name || (locale === 'en' ? 'Friend' : 'Prieten');
    const baseSubject = locale === 'en' ? templateToUse.subject_en : templateToUse.subject_ro;
    const finalSubject = (emailType === '72h'
      ? (locale === 'en' ? `Here is your ${couponValue72h}% discount for your cart!` : `Ai ${couponValue72h}% reducere pentru produsele din coș!`)
      : baseSubject
    )
      .replace('{{name}}', customerName.split(' ')[0])
      .replace('{{coupon}}', couponCode72h)
      .replace('{{value}}', String(couponValue72h));

    let parsedItems = session.items || [];
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch {
        parsedItems = [];
      }
    }
    if (!Array.isArray(parsedItems)) parsedItems = [];

    const autoCartUrl = `https://www.trenzone.fit/${locale}/checkout${emailType === '72h' ? `?coupon=${encodeURIComponent(couponCode72h)}` : ''}`;

    try {
      await resend.emails.send({
        from: 'TrenZone <contact@trenzone.fit>',
        to: emailObj,
        subject: finalSubject,
        react: AbandonedCartEmail({
          customerName,
          items: parsedItems,
          locale: locale as 'ro' | 'en',
          cartUrl: autoCartUrl,
          templateData: templateToUse as any,
          userEmail: emailObj,
          couponCode: emailType === '72h' ? couponCode72h : undefined,
          couponValue: emailType === '72h' ? couponValue72h : undefined
        }) as any
      });

      recoveryEmailsSent[emailType] = true;
      recoveryEmailsSent[`${emailType}_sent_at`] = new Date().toISOString();
      if (emailType === '72h') {
        recoveryEmailsSent.last_coupon_code = couponCode72h;
        recoveryEmailsSent.last_coupon_value = couponValue72h;
      }
      recoveryEmailsSent.automated = true;
      await supabaseAdmin
        .from('checkout_sessions')
        .update({ recovery_emails_sent: recoveryEmailsSent })
        .eq('id', session.id);

      emailsSent++;
      if (emailType === '24h') emailsSent24h++;
      if (emailType === '72h') emailsSent72h++;

      // Throttle 600ms to stay safely below Resend's 2 requests/second rate limit
      await new Promise(resolve => setTimeout(resolve, 600));
    } catch (err) {
      console.error(`Failed to send ${emailType} email to ${emailObj}:`, err);
    }
  }

  return {
    success: true,
    processed: sessions.length,
    emailsSent,
    emailsSent24h,
    emailsSent72h,
    message: `Trimiterea automată a fost finalizată: ${emailsSent} emailuri trimise (${emailsSent24h} de 24h, ${emailsSent72h} de 72h cu 10% reducere).`
  };
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

    let amt = Number(s.total_amount) || 0;
    if (amt === 0 && Array.isArray(s.items)) {
      amt = s.items.reduce((acc: number, curr: any) => acc + ((Number(curr.price) || 0) * (Number(curr.quantity) || 1)), 0);
    }

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

    let amt = Number(s.total_amount) || 0;
    if (amt === 0 && Array.isArray(s.items)) {
      amt = s.items.reduce((acc: number, curr: any) => acc + ((Number(curr.price) || 0) * (Number(curr.quantity) || 1)), 0);
    }

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

    let parsedItems = s.items || [];
    if (typeof parsedItems === 'string') {
      try {
        parsedItems = JSON.parse(parsedItems);
      } catch {
        parsedItems = [];
      }
    }
    if (!Array.isArray(parsedItems)) parsedItems = [];

    const customerFirstName = person.name.split(' ')[0] || (locale === 'en' ? 'Friend' : 'Prieten');
    const defaultSubject = locale === 'en'
      ? `Here is your ${couponValue}% discount for your cart!`
      : `Ai ${couponValue}% reducere pentru produsele din coș!`;

    const rawSubject = template ? (locale === 'en' ? template.subject_en : template.subject_ro) : defaultSubject;
    const finalSubject = (rawSubject || defaultSubject)
      .replace('{{name}}', customerFirstName)
      .replace('{{coupon}}', couponCode)
      .replace('{{value}}', String(couponValue));

    const cartCheckoutUrl = `https://www.trenzone.fit/${locale}/checkout?coupon=${encodeURIComponent(couponCode)}`;

    try {
      const resendResult = await resend.emails.send({
        from: 'TrenZone <contact@trenzone.fit>',
        to: email,
        subject: finalSubject,
        react: AbandonedCartEmail({
          customerName: person.name,
          items: parsedItems,
          locale: locale as 'ro' | 'en',
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

