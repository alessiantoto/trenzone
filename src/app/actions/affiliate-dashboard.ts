'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAffiliateSession } from './affiliate-auth';
import { revalidatePath } from 'next/cache';
import { convertToRon, getServerExchangeRates } from '@/utils/pricing';
import {
  computeAffiliateOrderMetrics,
  computeAffiliateFinancialSummary,
  convertAffiliateItemPriceToRon,
  type AffiliateNonCountableReason,
  type AffiliateOrderPayoutStatus,
  type AffiliatePayoutRecord,
} from '@/lib/affiliate-stats';

export interface AffiliateOrderItem {
  name: string;
  quantity: number;
  price: number;
  variant?: string | null;
  image?: string;
}

export interface AffiliateOrderHistory {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  currency: string;
  originalCurrency: string;
  originalTotalAmount: number;
  totalAmount: number;
  subtotal: number;
  shippingAmount: number;
  commissionAmount: number;
  eligibleCommissionAmount: number;
  pendingPickupCommissionAmount: number;
  customerName?: string;
  customerCity?: string;
  isCountable: boolean;
  payoutStatus: AffiliateOrderPayoutStatus;
  isPayoutEligible: boolean;
  payoutStatusLabelRo: string;
  payoutStatusLabelEn: string;
  nonCountableReason?: AffiliateNonCountableReason | null;
  nonCountableLabel?: string;
  items: AffiliateOrderItem[];
}

export interface AffiliateDashboardResponse {
  name: string;
  email: string;
  code: string;
  commissionPercent: number;
  totalSales: number;
  totalNetSales: number;
  eligibleCommissions: number;
  pendingPickupCommissions: number;
  totalCommissions: number;
  pendingPayout: number;
  paidPayout: number;
  overpaidAmount: number;
  payoutProgressPercent: number;
  usagesCount: number;
  deliveredOrdersCount: number;
  inTransitOrdersCount: number;
  cancelledOrdersCount: number;
  joinedAt: string;
  lastPayoutAt: string | null;
  payoutHistory: AffiliatePayoutRecord[];
  paymentDetails: {
    iban?: string;
    bankName?: string;
    accountHolder?: string;
    paidAmount?: number;
  };
  orders: AffiliateOrderHistory[];
}

export async function getAffiliateDashboardData(): Promise<{ success: boolean; data?: AffiliateDashboardResponse; error?: string }> {
  const session = await getAffiliateSession();
  
  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  // 1. Fetch affiliate profile
  const { data: affiliate, error: affError } = await supabaseAdmin
    .from('affiliates')
    .select('id, name, email, code, commission_percent, total_earnings_ron, usage_count, status, requested_at, activated_at, updated_at, payment_details')
    .eq('id', session.id)
    .maybeSingle();

  if (affError || !affiliate) {
    console.error('Affiliate fetch error:', affError);
    return { success: false, error: 'Afiliat inexistent.' };
  }

  if (affiliate.status !== 'active') {
    return { success: false, error: 'Contul tău de afiliat nu este activ.' };
  }

  const commissionPercent = Number(affiliate.commission_percent) || 10;
  const affiliateCode = (affiliate.code || '').trim().replace(/[^A-Za-z0-9_-]/g, '');
  const escapedCode = affiliateCode.replace(/[\\%_]/g, '\\$&');

  // 2. Fetch coupons associated with this affiliate code (case-insensitive)
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('id, code')
    .ilike('code', escapedCode);

  let couponList = coupons || [];
  if (couponList.length === 0 && affiliateCode) {
    const { data: exactCoupons } = await supabaseAdmin
      .from('coupons')
      .select('id, code')
      .eq('code', affiliateCode.toUpperCase());
    if (exactCoupons && exactCoupons.length > 0) {
      couponList = exactCoupons;
    }
  }

  const couponIds = couponList
    .map(c => c.id)
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

  // 3. Fetch orders matching the affiliate's coupon IDs or carrier_metadata coupon code
  let fetchedOrders: any[] = [];
  const orFilters: string[] = [];
  if (couponIds.length > 0) {
    orFilters.push(`coupon_id.in.(${couponIds.join(',')})`);
  }
  if (affiliateCode) {
    orFilters.push(`carrier_metadata->>coupon_code.ilike.${escapedCode}`);
    orFilters.push(`carrier_metadata->>coupon.ilike.${escapedCode}`);
  }

  if (orFilters.length > 0) {
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, payment_intent_id, receipt_url, coupon_id, total_amount, subtotal, discount_total, shipping_amount, currency, status, items, carrier_metadata, created_at, customer_firstname, customer_lastname, addr_city')
      .or(orFilters.join(','))
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.warn('Affiliate orders fetch warning:', ordersError);
    } else if (ordersData) {
      fetchedOrders = ordersData;
    }
  }

  // 4. Map and enrich orders with products and commission calculations
  const liveRates = await getServerExchangeRates();
  const toRon = (amount: number, currency: string) => convertToRon(amount, currency, liveRates);

  const mappedOrders: AffiliateOrderHistory[] = fetchedOrders.map((o) => {
    const metrics = computeAffiliateOrderMetrics(o, commissionPercent, toRon);

    // Clean order number (prefer human-friendly ODIN reference over raw payment id)
    const odinId = o.receipt_url?.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/)?.[0] 
      || (o.payment_intent_id?.startsWith('TZ-') ? o.payment_intent_id : null)
      || (o.payment_intent_id?.startsWith('CHAMP-') ? o.payment_intent_id : null);

    const orderNumber = odinId 
      ? odinId 
      : (o.id ? o.id.slice(0, 8).toUpperCase() : 'ORD');

    const cleanFirst = (o.customer_firstname || '').trim();
    const cleanLast = (o.customer_lastname || '').trim();
    const customerName = [cleanFirst, cleanLast].filter(Boolean).join(' ').trim() || 'Client';
    const customerCity = o.addr_city || '';

    // Process items (what was bought: title, flavor/variant, quantity, image)
    const rawItems = Array.isArray(o.items) ? o.items : [];
    const rawItemsSum = rawItems.reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * Math.max(1, Number(it.quantity) || 1),
      0
    );
    const items: AffiliateOrderItem[] = rawItems.map((item: any) => {
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
      customerCity,
      createdAt: o.created_at || new Date().toISOString(),
      status: o.status || 'processing',
      isCountable: metrics.isCountable,
      payoutStatus: metrics.payoutStatus,
      isPayoutEligible: metrics.isPayoutEligible,
      payoutStatusLabelRo: metrics.payoutStatusLabelRo,
      payoutStatusLabelEn: metrics.payoutStatusLabelEn,
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

  // Accurate totals: ground truth from valid orders (payout eligibility strictly requires parcel pickup)
  const paymentDetails = affiliate.payment_details || {};
  const summary = computeAffiliateFinancialSummary(
    mappedOrders,
    commissionPercent,
    paymentDetails,
    Number(affiliate.total_earnings_ron) || 0,
    Number(affiliate.usage_count) || 0
  );

  return {
    success: true,
    data: {
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      commissionPercent,
      totalSales: summary.totalSales,
      totalNetSales: summary.totalNetSales,
      eligibleCommissions: summary.eligibleCommissions,
      pendingPickupCommissions: summary.pendingPickupCommissions,
      totalCommissions: summary.totalCommissions,
      pendingPayout: summary.pendingPayout,
      paidPayout: summary.paidPayout,
      overpaidAmount: summary.overpaidAmount,
      payoutProgressPercent: summary.payoutProgressPercent,
      usagesCount: summary.validOrdersCount,
      deliveredOrdersCount: summary.deliveredOrdersCount,
      inTransitOrdersCount: summary.inTransitOrdersCount,
      cancelledOrdersCount: summary.cancelledOrdersCount,
      joinedAt: affiliate.activated_at || affiliate.requested_at || new Date().toISOString(),
      lastPayoutAt: summary.lastPayoutAt,
      payoutHistory: summary.payouts,
      paymentDetails: {
        iban: paymentDetails.iban || '',
        bankName: paymentDetails.bank_name || paymentDetails.bank || '',
        accountHolder: paymentDetails.account_holder || affiliate.name,
        paidAmount: summary.paidPayout
      },
      orders: mappedOrders
    }
  };
}

/**
 * Update Affiliate Payout / Bank Details (IBAN, Bank Name, Account Holder)
 */
export async function updateAffiliatePaymentDetailsAction(formData: {
  iban: string;
  bankName: string;
  accountHolder: string;
}) {
  const session = await getAffiliateSession();
  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  // 🛡️ Anti-XSS & Anti-Injection Sanitization
  if (typeof formData.iban !== 'string' || typeof formData.bankName !== 'string' || typeof formData.accountHolder !== 'string') {
    return { success: false, error: 'Date invalide.' };
  }

  // Block any HTML/script injection attempts
  if (/[<>{}]/i.test(formData.iban) || /[<>{}]/i.test(formData.bankName) || /[<>{}]/i.test(formData.accountHolder)) {
    return { success: false, error: 'Caractere nepermise detectate.' };
  }

  const cleanIban = formData.iban.trim().replace(/\s+/g, '').toUpperCase().slice(0, 34);
  const cleanBank = formData.bankName.replace(/<[^>]*>?/gm, '').trim().slice(0, 60);
  const cleanHolder = formData.accountHolder.replace(/<[^>]*>?/gm, '').trim().slice(0, 80);

  // Validate IBAN format (starts with 2 country letters, followed by 10-32 alphanumeric characters)
  if (!cleanIban || !/^[A-Z]{2}[0-9A-Z]{10,32}$/.test(cleanIban)) {
    return { success: false, error: 'Codul IBAN introdus nu are un format valid (ex: RO49AAAA...).' };
  }

  // Fetch current payment details
  const { data: currentAff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details')
    .eq('id', session.id)
    .single();

  if (fetchErr) {
    return { success: false, error: 'Eroare la actualizarea datelor de plată.' };
  }

  const existingDetails = currentAff?.payment_details || {};
  const updatedDetails = {
    ...existingDetails,
    iban: cleanIban,
    bank_name: cleanBank,
    account_holder: cleanHolder,
    updated_at: new Date().toISOString()
  };

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      payment_details: updatedDetails,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id);

  if (updateErr) {
    console.error('Error saving affiliate payment details:', updateErr);
    return { success: false, error: 'Salvarea a eșuat. Încearcă din nou.' };
  }

  revalidatePath('/[locale]/affiliate/dashboard', 'page');
  return { success: true };
}

export async function deleteAffiliatePaymentDetailsAction(): Promise<{ success: boolean; error?: string }> {
  const session = await getAffiliateSession();
  if (!session?.id) {
    return { success: false, error: 'Neautorizat' };
  }

  const { data: currentAff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details')
    .eq('id', session.id)
    .single();

  if (fetchErr) {
    return { success: false, error: 'Eroare la ștergerea datelor de plată.' };
  }

  const existingDetails = currentAff?.payment_details || {};
  const updatedDetails = {
    ...existingDetails,
    iban: null,
    bank_name: null,
    account_holder: null,
    updated_at: new Date().toISOString()
  };

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      payment_details: updatedDetails,
      updated_at: new Date().toISOString()
    })
    .eq('id', session.id);

  if (updateErr) {
    console.error('Error deleting affiliate payment details:', updateErr);
    return { success: false, error: 'Ștergerea a eșuat. Încearcă din nou.' };
  }

  revalidatePath('/[locale]/affiliate/dashboard', 'page');
  return { success: true };
}
