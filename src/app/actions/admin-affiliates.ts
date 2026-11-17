"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { createClient } from "@/utils/supabase/server";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";
import {
  computeAffiliateOrderMetrics,
  computeAffiliateFinancialSummary,
  convertAffiliateItemPriceToRon,
  formatRon,
  normalizeAffiliatePayouts,
  roundCurrency,
} from "@/lib/affiliate-stats";
import { getSiteUrl } from "@/lib/site-config";

export async function getAdminAffiliates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error(`Acces neautorizat.`);
  }

  const { data: affiliatesData, error } = await supabaseAdmin
    .from('affiliates')
    .select('*')
    .order('requested_at', { ascending: false });

  const liveRates = await getServerExchangeRates();

  if (error) {
    console.error("❌ [ADMIN AFFILIATES] Fetch Error:", error);
    return {
      affiliates: [],
      stats: {
        totalSales: 0,
        totalNetSales: 0,
        totalEligibleCommissions: 0,
        totalPendingPickup: 0,
        totalCommissions: 0,
        totalPaid: 0,
        totalPending: 0,
        totalOrders: 0,
        totalDeliveredOrders: 0,
        totalInTransitOrders: 0,
        activeCount: 0,
        pendingCount: 0,
      },
    };
  }

  // Fetch coupons to map affiliate codes to coupon IDs (excluding scratch coupons to avoid 1000 row limit truncation)
  const { data: couponsData } = await supabaseAdmin
    .from('coupons')
    .select('id, code')
    .not('code', 'ilike', 'SCRATCH-%');

  const codeToCouponIds: Record<string, Set<string>> = {};
  (couponsData || []).forEach(c => {
    if (c.code) {
      const lower = c.code.toLowerCase().trim();
      if (!codeToCouponIds[lower]) codeToCouponIds[lower] = new Set();
      codeToCouponIds[lower].add(c.id.toLowerCase());
    }
  });

  // Fetch all orders with coupon or discount, including customer details
  const { data: ordersData } = await supabaseAdmin
    .from('orders')
    .select('id, payment_intent_id, receipt_url, coupon_id, total_amount, subtotal, discount_total, shipping_amount, currency, status, payment_method, items, created_at, carrier_metadata, customer_firstname, customer_lastname, customer_email, customer_phone, addr_city')
    .order('created_at', { ascending: false });

  const toRon = (amount: number, currency: string) => convertToRon(amount, currency, liveRates);

  const mappedAffiliates = (affiliatesData || []).map(affiliate => {
    const commissionPercent = Number(affiliate.commission_percent) || 10;
    const affiliateCode = (affiliate.code || '').trim().toLowerCase();
    const matchingCouponIds = affiliateCode ? (codeToCouponIds[affiliateCode] || new Set<string>()) : new Set<string>();

    // Find orders placed using this affiliate's coupon or code
    const matchingOrders = (ordersData || []).filter(o => {
      if (!affiliateCode) return false;
      const orderCouponId = String(o.coupon_id || '').toLowerCase().trim();
      const carrierCoupon = String(o.carrier_metadata?.coupon_code || o.carrier_metadata?.coupon || '').toLowerCase().trim();

      return (
        (orderCouponId && matchingCouponIds.has(orderCouponId)) ||
        orderCouponId === affiliateCode ||
        carrierCoupon === affiliateCode
      );
    });

    const mappedOrders = matchingOrders.map((o: any) => {
      const metrics = computeAffiliateOrderMetrics(o, commissionPercent, toRon);

      const odinId = o.receipt_url?.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/)?.[0] 
        || (o.payment_intent_id?.startsWith('TZ-') ? o.payment_intent_id : null)
        || (o.payment_intent_id?.startsWith('CHAMP-') ? o.payment_intent_id : null);

      const orderNumber = odinId || (o.id ? o.id.slice(0, 8).toUpperCase() : 'ORD');

      const customerName = [o.customer_firstname, o.customer_lastname].filter(Boolean).join(' ').trim() || 'Client Anonim';
      const customerEmail = o.customer_email || '';
      const customerPhone = o.customer_phone || '';
      const customerCity = o.addr_city || '';

      const rawItems = Array.isArray(o.items) ? o.items : [];
      const rawItemsSum = rawItems.reduce(
        (sum: number, it: any) => sum + (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
        0
      );
      const items = rawItems.map((item: any) => {
        let itemName = typeof item.name === 'object' && item.name !== null
          ? item.name.ro || item.name.en || Object.values(item.name)[0] || 'Produs'
          : String(item.name || 'Produs');

        let variantStr = item.selectedVariant?.name || item.variant || null;
        if (typeof variantStr === 'object' && variantStr !== null) {
          variantStr = variantStr.ro || variantStr.en || Object.values(variantStr)[0] || null;
        }

        return {
          name: itemName,
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: convertAffiliateItemPriceToRon(Number(item.price) || 0, rawItemsSum, o, toRon),
          variant: variantStr,
          image: item.image || item.main_image || ''
        };
      });

      return {
        id: o.id,
        orderNumber,
        customerName,
        customerEmail,
        customerPhone,
        customerCity,
        createdAt: o.created_at || new Date().toISOString(),
        formattedDate: new Date(o.created_at).toLocaleString('ro-RO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: o.status || 'processing',
        paymentMethod: o.payment_method || null,
        isCountable: metrics.isCountable,
        payoutStatus: metrics.payoutStatus,
        isPayoutEligible: metrics.isPayoutEligible,
        payoutStatusLabel: metrics.payoutStatusLabelRo,
        nonCountableReason: metrics.nonCountableReason,
        nonCountableLabel: metrics.nonCountableLabel,
        // Converted amounts are always expressed in RON
        currency: 'RON',
        originalCurrency: metrics.originalCurrency,
        originalTotalAmount: metrics.originalTotalAmount,
        totalAmount: metrics.totalAmount,
        subtotal: metrics.subtotal,
        shippingAmount: metrics.shippingAmount,
        commissionAmount: metrics.commissionAmount,
        eligibleCommissionAmount: metrics.eligibleCommissionAmount,
        pendingPickupCommissionAmount: metrics.pendingPickupCommissionAmount,
        items
      };
    });

    const paymentDetails = affiliate.payment_details || {};
    const summary = computeAffiliateFinancialSummary(
      mappedOrders,
      commissionPercent,
      paymentDetails,
      Number(affiliate.total_earnings_ron) || 0,
      Number(affiliate.usage_count) || 0
    );

    const affLocale = (affiliate.locale || affiliate.social_links?.locale) === 'en' ? 'en' : 'ro';
    const referralLink = `${getCanonicalBaseUrl()}/${affLocale}?ref=${encodeURIComponent(affiliate.code || '')}`;

    return {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code || 'N/A',
      referralLink,
      commission: `${commissionPercent}%`,
      commissionRaw: commissionPercent,
      totalSales: formatRon(summary.totalSales),
      totalSalesRaw: summary.totalSales,
      totalNetSales: formatRon(summary.totalNetSales),
      totalNetSalesRaw: summary.totalNetSales,
      eligibleCommissions: formatRon(summary.eligibleCommissions),
      eligibleCommissionsRaw: summary.eligibleCommissions,
      pendingPickupCommissions: formatRon(summary.pendingPickupCommissions),
      pendingPickupCommissionsRaw: summary.pendingPickupCommissions,
      totalCommissions: formatRon(summary.totalCommissions),
      totalCommissionsRaw: summary.totalCommissions,
      pendingPayout: formatRon(summary.pendingPayout),
      pendingPayoutRaw: summary.pendingPayout,
      paidPayout: formatRon(summary.paidPayout),
      paidPayoutRaw: summary.paidPayout,
      overpaidAmountRaw: summary.overpaidAmount,
      payoutProgressPercent: summary.payoutProgressPercent,
      aov: formatRon(summary.aov),
      aovRaw: summary.aov,
      usages: summary.validOrdersCount,
      deliveredOrdersCount: summary.deliveredOrdersCount,
      inTransitOrdersCount: summary.inTransitOrdersCount,
      cancelledOrdersCount: summary.cancelledOrdersCount,
      totalOrdersMatched: mappedOrders.length,
      lastPayoutAt: summary.lastPayoutAt,
      status: affiliate.status || 'pending',
      requestedAt: affiliate.requested_at ? new Date(affiliate.requested_at).toLocaleDateString('ro-RO') : null,
      activatedAt: affiliate.activated_at ? new Date(affiliate.activated_at).toLocaleDateString('ro-RO') : null,
      socialLinks: affiliate.social_links,
      paymentDetails: {
        iban: paymentDetails.iban || '',
        bankName: paymentDetails.bank_name || paymentDetails.bank || '',
        accountHolder: paymentDetails.account_holder || affiliate.name,
        paidAmount: summary.paidPayout,
        lastPayoutAt: summary.lastPayoutAt,
        payouts: summary.payouts,
      },
      orders: mappedOrders,
      history: []
    };
  });

  const activeCount = mappedAffiliates.filter(a => a.status === 'active').length;
  const pendingCount = mappedAffiliates.filter(a => a.status === 'pending').length;
  const totalSales = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.totalSalesRaw || 0), 0));
  const totalNetSales = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.totalNetSalesRaw || 0), 0));
  const totalEligibleCommissions = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.eligibleCommissionsRaw || 0), 0));
  const totalPendingPickup = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.pendingPickupCommissionsRaw || 0), 0));
  const totalCommissions = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.totalCommissionsRaw || 0), 0));
  const totalPaid = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.paidPayoutRaw || 0), 0));
  const totalPending = roundCurrency(mappedAffiliates.reduce((sum, a) => sum + (a.pendingPayoutRaw || 0), 0));
  const totalOrders = mappedAffiliates.reduce((sum, a) => sum + (a.usages || 0), 0);
  const totalDeliveredOrders = mappedAffiliates.reduce((sum, a) => sum + (a.deliveredOrdersCount || 0), 0);
  const totalInTransitOrders = mappedAffiliates.reduce((sum, a) => sum + (a.inTransitOrdersCount || 0), 0);

  return {
    affiliates: mappedAffiliates,
    stats: {
      totalSales,
      totalNetSales,
      totalEligibleCommissions,
      totalPendingPickup,
      totalCommissions,
      totalPaid,
      totalPending,
      totalOrders,
      totalDeliveredOrders,
      totalInTransitOrders,
      activeCount,
      pendingCount,
    }
  };
}

async function computeSingleAffiliateFinancialSummary(affiliate: {
  code?: string | null;
  commission_percent?: unknown;
  payment_details?: any;
  total_earnings_ron?: unknown;
  usage_count?: unknown;
}) {
  const commissionPercent = Number(affiliate.commission_percent) || 10;
  const cleanCode = String(affiliate.code || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  let matchingOrders: any[] = [];

  if (cleanCode) {
    const escapedCode = escapeLike(cleanCode);
    const { data: coupons } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .ilike('code', escapedCode);

    const couponIds = (coupons || [])
      .map((c) => c.id)
      .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    const orFilters: string[] = [];
    if (couponIds.length > 0) {
      orFilters.push(`coupon_id.in.(${couponIds.join(',')})`);
    }
    orFilters.push(`carrier_metadata->>coupon_code.ilike.${escapedCode}`);
    orFilters.push(`carrier_metadata->>coupon.ilike.${escapedCode}`);

    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('total_amount, subtotal, discount_total, shipping_amount, currency, status, items, carrier_metadata')
      .or(orFilters.join(','));

    if (ordersData) {
      matchingOrders = ordersData;
    }
  }

  const liveRates = await getServerExchangeRates();
  const toRon = (amount: number, currency: string) => convertToRon(amount, currency, liveRates);
  const metricsList = matchingOrders.map((o) => computeAffiliateOrderMetrics(o, commissionPercent, toRon));

  return computeAffiliateFinancialSummary(
    metricsList,
    commissionPercent,
    affiliate.payment_details || {},
    Number(affiliate.total_earnings_ron) || 0,
    Number(affiliate.usage_count) || 0
  );
}

export async function recordAffiliatePayoutAction(affiliateId: string, amount: number, note?: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const roundedAmount = roundCurrency(amount);
  if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
    return { success: false, error: 'Te rugăm să introduci o sumă validă.' };
  }

  const { data: aff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details, name, code, commission_percent, total_earnings_ron, usage_count')
    .eq('id', affiliateId)
    .single();

  if (fetchErr || !aff) return { success: false, error: 'Afiliat negăsit.' };

  const liveSummary = await computeSingleAffiliateFinancialSummary(aff);
  if (liveSummary.pendingPayout <= 0) {
    return {
      success: false,
      error: 'Nu există sold eligibil „De încasat”. Comisioanele devin eligibile de plată doar după ridicarea coletului.',
    };
  }

  if (roundedAmount > liveSummary.pendingPayout + 0.01) {
    return {
      success: false,
      error: `Suma depășește soldul eligibil („De încasat”) de ${formatRon(liveSummary.pendingPayout)} din coletele ridicate.`,
    };
  }

  const finalPayoutAmount = Math.min(roundedAmount, liveSummary.pendingPayout);
  const currentDetails = aff.payment_details || {};
  const { payouts: existingPayouts, paidAmount: currentPaid } = normalizeAffiliatePayouts(currentDetails);

  const now = new Date().toISOString();
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  const payoutId = globalThis.crypto?.randomUUID?.() || `payout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const newEntry = {
    id: payoutId,
    amount: finalPayoutAmount,
    paidAt: now,
    ...(cleanNote ? { note: cleanNote } : {}),
    ...(currentDetails.iban ? { ibanSnapshot: String(currentDetails.iban) } : {}),
  };

  // Persist sanitized list (preserving any migrated legacy payout record)
  const sanitizedExisting = existingPayouts.map(({ isLegacy: _legacy, ...rest }) => rest);
  const updatedPayouts = [newEntry, ...sanitizedExisting];
  const newPaid = roundCurrency(currentPaid + finalPayoutAmount);

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: {
        ...currentDetails,
        paid_amount: newPaid,
        last_payout_at: now,
        payouts: updatedPayouts,
      },
      updated_at: now,
    })
    .eq('id', affiliateId);

  if (updateErr) return { success: false, error: 'Eroare la actualizarea plății.' };

  return { success: true, newPaid, payout: newEntry, payouts: updatedPayouts };
}

export async function deleteAffiliatePayoutAction(affiliateId: string, payoutId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  if (!payoutId || !payoutId.trim()) {
    return { success: false, error: 'ID plată invalid.' };
  }

  const { data: aff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details')
    .eq('id', affiliateId)
    .single();

  if (fetchErr || !aff) return { success: false, error: 'Afiliat negăsit.' };

  const currentDetails = aff.payment_details || {};
  const { payouts: existingPayouts } = normalizeAffiliatePayouts(currentDetails);

  const targetExists = existingPayouts.some((p) => p.id === payoutId);
  if (!targetExists) {
    return { success: false, error: 'Înregistrarea plății nu a fost găsită.' };
  }

  const remainingPayouts = existingPayouts
    .filter((p) => p.id !== payoutId)
    .map(({ isLegacy: _legacy, ...rest }) => rest);

  const newPaid = roundCurrency(remainingPayouts.reduce((sum, p) => sum + p.amount, 0));
  const now = new Date().toISOString();
  const nextLastPayoutAt = remainingPayouts[0]?.paidAt || null;

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: {
        ...currentDetails,
        paid_amount: newPaid,
        last_payout_at: nextLastPayoutAt,
        payouts: remainingPayouts,
      },
      updated_at: now,
    })
    .eq('id', affiliateId);

  if (updateErr) return { success: false, error: 'Eroare la ștergerea înregistrării.' };

  return { success: true, newPaid, payouts: remainingPayouts };
}

import { sendAffiliateApprovalEmail } from '@/lib/resend-service';

function escapeLike(val: string): string {
  return val.replace(/[\\%_]/g, '\\$&');
}

function getCanonicalBaseUrl(): string {
  return getSiteUrl();
}

async function checkCodeConflict(cleanCode: string, excludeAffiliateId?: string): Promise<string | null> {
  let query = supabaseAdmin
    .from('affiliates')
    .select('id, name, email, status')
    .ilike('code', escapeLike(cleanCode));

  if (excludeAffiliateId) {
    query = query.neq('id', excludeAffiliateId);
  }

  const { data: conflicts, error } = await query.limit(1);
  if (error) {
    console.error('Code conflict check error:', error);
    return 'Eroare la verificarea unicității codului de afiliat.';
  }

  const conflict = conflicts?.[0];
  if (conflict && conflict.status !== 'rejected') {
    return `Codul "${cleanCode}" este deja atribuit afiliatului ${conflict.name} (${conflict.email}). Alege un cod unic.`;
  }

  // Prevent silently overwriting an existing standalone store promo coupon
  const { data: existingCoupon, error: couponErr } = await supabaseAdmin
    .from('coupons')
    .select('id, code')
    .ilike('code', escapeLike(cleanCode))
    .limit(1)
    .maybeSingle();

  if (couponErr) {
    console.error('Coupon conflict check error:', couponErr);
    return 'Eroare la verificarea codului de cupon în baza de date.';
  }

  if (existingCoupon) {
    let ownedByCurrentActiveAffiliate = false;
    if (excludeAffiliateId) {
      const { data: currentAff } = await supabaseAdmin
        .from('affiliates')
        .select('code, status')
        .eq('id', excludeAffiliateId)
        .maybeSingle();
      if (
        currentAff &&
        currentAff.status === 'active' &&
        String(currentAff.code || '').toUpperCase() === cleanCode.toUpperCase()
      ) {
        ownedByCurrentActiveAffiliate = true;
      }
    }
    if (!ownedByCurrentActiveAffiliate) {
      return `Codul "${cleanCode}" există deja ca și cupon promoțional în magazin. Alege un cod unic pentru afiliat.`;
    }
  }
  return null;
}

async function ensureActiveAffiliateCoupon(cleanCode: string, commission: number): Promise<string | null> {
  const { data: existingCoupon, error: lookupErr } = await supabaseAdmin
    .from('coupons')
    .select('id, code, is_active')
    .ilike('code', escapeLike(cleanCode))
    .limit(1)
    .maybeSingle();

  if (lookupErr) {
    console.error('Coupon lookup error:', lookupErr);
    return `Eroare la verificarea cuponului în baza de date: ${lookupErr.message}`;
  }

  if (existingCoupon) {
    const { error: updateErr } = await supabaseAdmin
      .from('coupons')
      .update({ code: cleanCode, is_active: true, value: commission })
      .eq('id', existingCoupon.id);

    if (updateErr) {
      console.error('Coupon update error:', updateErr);
      return `Eroare la activarea cuponului "${cleanCode}": ${updateErr.message}`;
    }
  } else {
    const { error: insertErr } = await supabaseAdmin
      .from('coupons')
      .insert({
        code: cleanCode,
        type: 'percentage',
        value: commission,
        usage_limit: null,
        expires_at: null,
        is_active: true,
        used_count: 0,
        created_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error('Coupon insert error:', insertErr);
      return `Eroare la crearea cuponului "${cleanCode}": ${insertErr.message}`;
    }
  }

  return null;
}

async function setCouponActiveState(code: string | null | undefined, isActive: boolean): Promise<void> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode || !/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) return;
  const { error } = await supabaseAdmin
    .from('coupons')
    .update({ is_active: isActive })
    .ilike('code', escapeLike(cleanCode));
  if (error) {
    console.warn(`Could not set coupon ${cleanCode} is_active=${isActive}:`, error);
  }
}

export async function approveAffiliate(id: string, code: string, commission: number) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  // Fetch the affiliate to get email, name, and locale
  const { data: affiliate, error: fetchError } = await supabaseAdmin
    .from('affiliates')
    .select('email, name, social_links')
    .eq('id', id)
    .single();

  if (fetchError || !affiliate) {
    console.error("Failed to fetch affiliate:", fetchError);
    return { success: false, error: 'Nu am putut prelua datele afiliatului.' };
  }

  const cleanCode = (code || '').replace(/\s+/g, '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  const validCommission = Number(commission);
  if (!Number.isFinite(validCommission) || validCommission < 1 || validCommission > 50) {
    return { success: false, error: 'Comisionul trebuie să fie între 1% și 50%.' };
  }

  const conflictErr = await checkCodeConflict(cleanCode, id);
  if (conflictErr) {
    return { success: false, error: conflictErr };
  }

  // 1. Ensure coupon exists & is active in `coupons` table
  const couponErr = await ensureActiveAffiliateCoupon(cleanCode, validCommission);
  if (couponErr) {
    return { success: false, error: couponErr };
  }

  // 2. Update affiliate status to active
  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      status: 'active', 
      code: cleanCode,
      commission_percent: validCommission,
      activated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error("Failed to approve affiliate:", error);
    return { success: false, error: `A apărut o eroare la aprobarea afiliatului: ${error.message}` };
  }

  // 3. Determine locale from social_links JSON
  const locale = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  
  // Construct login URL
  const baseUrl = getCanonicalBaseUrl(); 
  const loginUrl = `${baseUrl}/${locale}/affiliate/login`;

  // 4. Send the approval email and surface delivery result honestly to Admin UI
  let emailSent = true;
  let emailError: string | undefined;
  try {
    await sendAffiliateApprovalEmail(affiliate.email, affiliate.name, cleanCode, locale, loginUrl, validCommission);
  } catch (err: any) {
    emailSent = false;
    emailError = err?.message || String(err);
    console.error("Failed to send approval email, but affiliate was approved:", emailError);
  }

  return { success: true, emailSent, emailError };
}

export async function updateAffiliate(id: string, code: string, commission: number) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { data: affiliate, error: fetchError } = await supabaseAdmin
    .from('affiliates')
    .select('email, name, code, commission_percent, social_links')
    .eq('id', id)
    .single();

  if (fetchError || !affiliate) {
    return { success: false, error: 'Nu am putut prelua datele afiliatului.' };
  }

  const cleanCode = (code || '').replace(/\s+/g, '').trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  const validCommission = Number(commission);
  if (!Number.isFinite(validCommission) || validCommission < 1 || validCommission > 50) {
    return { success: false, error: 'Comisionul trebuie să fie între 1% și 50%.' };
  }

  const conflictErr = await checkCodeConflict(cleanCode, id);
  if (conflictErr) {
    return { success: false, error: conflictErr };
  }

  // If code is changed, preserve historical orders linked via coupon_id
  if (cleanCode !== (affiliate.code || '').trim().toUpperCase()) {
    const { data: existingNewCoupon } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .ilike('code', escapeLike(cleanCode))
      .limit(1)
      .maybeSingle();

    const { data: oldCoupon } = affiliate.code
      ? await supabaseAdmin.from('coupons').select('id').ilike('code', escapeLike(affiliate.code)).limit(1).maybeSingle()
      : { data: null };

    if (existingNewCoupon) {
      // Target coupon already exists: activate it & update value
      const { error: updErr } = await supabaseAdmin
        .from('coupons')
        .update({ code: cleanCode, is_active: true, value: validCommission })
        .eq('id', existingNewCoupon.id);
      if (updErr) return { success: false, error: `Eroare la actualizarea cuponului: ${updErr.message}` };

      // Re-link historical orders from oldCoupon.id to existingNewCoupon.id and deactivate old coupon
      if (oldCoupon && oldCoupon.id !== existingNewCoupon.id) {
        await supabaseAdmin
          .from('orders')
          .update({ coupon_id: existingNewCoupon.id })
          .eq('coupon_id', oldCoupon.id);
        await supabaseAdmin
          .from('coupons')
          .update({ is_active: false })
          .eq('id', oldCoupon.id);
      }
    } else if (oldCoupon) {
      // Rename the existing coupon in place so its UUID (and all historical orders.coupon_id links) stay intact
      const { error: renameErr } = await supabaseAdmin
        .from('coupons')
        .update({ code: cleanCode, value: validCommission, is_active: true })
        .eq('id', oldCoupon.id);
      if (renameErr) return { success: false, error: `Eroare la redenumirea cuponului: ${renameErr.message}` };
    } else {
      const couponErr = await ensureActiveAffiliateCoupon(cleanCode, validCommission);
      if (couponErr) return { success: false, error: couponErr };
    }
  } else {
    // Ensure existing coupon is synced cleanly
    const couponErr = await ensureActiveAffiliateCoupon(cleanCode, validCommission);
    if (couponErr) return { success: false, error: couponErr };
  }

  // Update affiliate
  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      code: cleanCode,
      commission_percent: validCommission,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: `A apărut o eroare la salvarea datelor: ${error.message}` };
  }

  // Determine locale from social_links JSON
  const locale = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  
  // Construct login URL
  const baseUrl = getCanonicalBaseUrl(); 
  const loginUrl = `${baseUrl}/${locale}/affiliate/login`;

  // Send update email
  let emailSent = true;
  let emailError: string | undefined;
  try {
    const { sendAffiliateUpdateEmail } = await import('@/lib/resend-service');
    await sendAffiliateUpdateEmail(affiliate.email, affiliate.name, cleanCode, locale, loginUrl, validCommission);
  } catch (err: any) {
    emailSent = false;
    emailError = err?.message || String(err);
    console.error("Failed to send update email:", emailError);
  }

  return { success: true, emailSent, emailError };
}

export async function createAdminAffiliate(data: {
  name: string;
  email: string;
  code: string;
  commission: number;
  sendEmail?: boolean;
  locale?: 'ro' | 'en';
}) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const cleanEmail = (data.email || '').trim().toLowerCase();
  const cleanCode = (data.code || '').replace(/\s+/g, '').trim().toUpperCase();
  const cleanName = (data.name || '').trim();
  const commission = Number(data.commission) || 10;

  if (!cleanEmail || !cleanCode || !cleanName) {
    return { success: false, error: "Numele, email-ul și codul de reducere sunt obligatorii." };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: "Adresa de email introdusă nu este validă." };
  }

  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de reducere poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  const { data: existingAffiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id, social_links')
    .ilike('email', escapeLike(cleanEmail))
    .limit(1)
    .maybeSingle();

  const conflictErr = await checkCodeConflict(cleanCode, existingAffiliate?.id);
  if (conflictErr) {
    return { success: false, error: conflictErr };
  }

  // 1. Ensure coupon exists & is active in `coupons` table
  const couponErr = await ensureActiveAffiliateCoupon(cleanCode, commission);
  if (couponErr) {
    return { success: false, error: couponErr };
  }

  // 2. Insert or update in `affiliates`
  if (existingAffiliate) {
    const { error: updateErr } = await supabaseAdmin
      .from('affiliates')
      .update({
        name: cleanName,
        email: cleanEmail,
        code: cleanCode,
        commission_percent: commission,
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', existingAffiliate.id);

    if (updateErr) return { success: false, error: updateErr.message };
  } else {
    const { error: insertErr } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name: cleanName,
        email: cleanEmail,
        code: cleanCode,
        commission_percent: commission,
        status: 'active',
        social_links: data.locale ? { locale: data.locale, links: [], motivation: '' } : undefined,
        requested_at: new Date().toISOString(),
        activated_at: new Date().toISOString()
      });

    if (insertErr) return { success: false, error: insertErr.message };
  }

  // 3. Send welcome / approval email if requested
  let emailSent = true;
  let emailError: string | undefined;
  if (data.sendEmail !== false) {
    try {
      const targetLocale: 'ro' | 'en' = (data.locale || existingAffiliate?.social_links?.locale) === 'en' ? 'en' : 'ro';
      const baseUrl = getCanonicalBaseUrl(); 
      const loginUrl = `${baseUrl}/${targetLocale}/affiliate/login`;
      await sendAffiliateApprovalEmail(cleanEmail, cleanName, cleanCode, targetLocale, loginUrl, commission);
    } catch (err: any) {
      emailSent = false;
      emailError = err?.message || String(err);
      console.warn("Could not send approval email to newly created affiliate:", emailError);
    }
  }

  return { success: true, emailSent, emailError };
}

export async function linkAffiliateCoupon(affiliateId: string, couponCode: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const cleanCode = couponCode.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ code: cleanCode })
    .eq('id', affiliateId);

  if (error) {
    console.error("Failed to link affiliate to coupon:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}


export async function rejectAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('code, status')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error("Failed to reject affiliate:", error);
    return { success: false, error: 'A apărut o eroare la respingerea afiliatului.' };
  }

  if (aff?.code && aff.status === 'active') {
    await setCouponActiveState(aff.code, false);
  }
  return { success: true };
}

export async function suspendAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('code')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error("Failed to suspend affiliate:", error);
    return { success: false, error: 'A apărut o eroare la suspendarea afiliatului.' };
  }

  await setCouponActiveState(aff?.code, false);
  return { success: true };
}

export async function activateAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('code, commission_percent, activated_at')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({
      status: 'active',
      activated_at: aff?.activated_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error("Failed to activate affiliate:", error);
    return { success: false, error: 'A apărut o eroare la activarea afiliatului.' };
  }

  if (aff?.code) {
    await ensureActiveAffiliateCoupon(aff.code.trim().toUpperCase(), Number(aff.commission_percent) || 10);
  }
  return { success: true };
}

export async function deleteAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { data: aff } = await supabaseAdmin
    .from('affiliates')
    .select('code, status')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from('affiliates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Failed to delete affiliate:", error);
    return { success: false, error: 'A apărut o eroare la ștergerea afiliatului.' };
  }

  if (aff?.code && aff.status !== 'pending' && aff.status !== 'rejected') {
    await setCouponActiveState(aff.code, false);
  }
  return { success: true };
}
