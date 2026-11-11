'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAffiliateSession } from './affiliate-auth';
import { revalidatePath } from 'next/cache';
import { convertToRon, getServerExchangeRates } from '@/utils/pricing';

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
  totalAmount: number;
  subtotal: number;
  commissionAmount: number;
  customerName?: string;
  customerCity?: string;
  isCountable?: boolean;
  items: AffiliateOrderItem[];
}

export interface AffiliateDashboardResponse {
  name: string;
  email: string;
  code: string;
  commissionPercent: number;
  totalSales: number;
  totalCommissions: number;
  pendingPayout: number;
  paidPayout: number;
  usagesCount: number;
  joinedAt: string;
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

  // 2. Fetch coupons associated with this affiliate code (case-insensitive)
  const { data: coupons } = await supabaseAdmin
    .from('coupons')
    .select('id, code')
    .ilike('code', affiliateCode);

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
    orFilters.push(`carrier_metadata->>coupon_code.ilike.${affiliateCode}`);
    orFilters.push(`carrier_metadata->>coupon.ilike.${affiliateCode}`);
  }

  if (orFilters.length > 0) {
    const { data: ordersData, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id, payment_intent_id, receipt_url, coupon_id, total_amount, subtotal, discount_total, currency, status, items, created_at, customer_firstname, customer_lastname, addr_city')
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
  let calculatedSales = 0;
  let calculatedCommissions = 0;
  let validOrdersCount = 0;

  const mappedOrders: AffiliateOrderHistory[] = fetchedOrders.map((o) => {
    const rawOrderTotal = Number(o.total_amount) || 0;
    const rawDiscount = Number(o.discount_total) || 0;
    const rawShipping = Number(o.shipping_amount) || 0;
    const rawBaseSubtotal = Number(o.subtotal) > 0 ? Number(o.subtotal) : Math.max(0, rawOrderTotal - rawShipping);
    const netOrderSubtotal = Math.max(0, rawBaseSubtotal - rawDiscount);
    const orderCurrency = (o.currency || 'RON').toUpperCase();
    const orderTotal = convertToRon(rawOrderTotal, orderCurrency, liveRates);
    const orderSubtotal = convertToRon(netOrderSubtotal, orderCurrency, liveRates);

    // Filter out canceled, returned, refunded, or failed orders from commission tally
    const isNonCountable = ['cancelled', 'anulat', 'anulata', 'returned', 'returnat', 'returnata', 'refunded', 'rambursat', 'failed', 'refused', 'neridicat'].includes(String(o.status || '').toLowerCase().trim());
    const commission = isNonCountable ? 0 : Math.round((orderSubtotal * (commissionPercent / 100)) * 100) / 100;

    if (!isNonCountable) {
      calculatedSales += orderTotal;
      calculatedCommissions += commission;
      validOrdersCount += 1;
    }

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
        price: Number(item.price) || 0,
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
      isCountable: !isNonCountable,
      currency: (o.currency || 'RON').toUpperCase(),
      totalAmount: orderTotal,
      subtotal: orderSubtotal,
      commissionAmount: commission,
      items
    };
  });

  // Accurate totals: ground truth from valid non-cancelled orders
  const totalSales = mappedOrders.length > 0
    ? Math.round(calculatedSales * 100) / 100
    : (Number(affiliate.total_earnings_ron) || 0);

  const totalCommissions = mappedOrders.length > 0
    ? Math.round(calculatedCommissions * 100) / 100
    : Math.round((totalSales * (commissionPercent / 100)) * 100) / 100;

  const paymentDetails = affiliate.payment_details || {};
  const paidPayout = Number(paymentDetails.paid_amount) || 0;
  const pendingPayout = Math.max(0, Math.round((totalCommissions - paidPayout) * 100) / 100);
  const usagesCount = mappedOrders.length > 0 ? validOrdersCount : (Number(affiliate.usage_count) || 0);

  return {
    success: true,
    data: {
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code,
      commissionPercent,
      totalSales,
      totalCommissions,
      pendingPayout,
      paidPayout,
      usagesCount,
      joinedAt: affiliate.activated_at || affiliate.requested_at || new Date().toISOString(),
      paymentDetails: {
        iban: paymentDetails.iban || '',
        bankName: paymentDetails.bank_name || paymentDetails.bank || '',
        accountHolder: paymentDetails.account_holder || affiliate.name,
        paidAmount: paidPayout
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
