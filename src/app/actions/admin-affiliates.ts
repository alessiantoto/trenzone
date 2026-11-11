"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { createClient } from "@/utils/supabase/server";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";

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
    return { affiliates: [], stats: { totalSales: 0, totalCommissions: 0, activeCount: 0 } };
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
    .select('id, payment_intent_id, receipt_url, coupon_id, total_amount, subtotal, discount_total, currency, status, items, created_at, carrier_metadata, customer_firstname, customer_lastname, customer_email, customer_phone, addr_city')
    .order('created_at', { ascending: false });

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

    let calculatedSales = 0;
    let calculatedCommissions = 0;
    let validOrdersCount = 0;

    const mappedOrders = matchingOrders.map((o: any) => {
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

      const odinId = o.receipt_url?.match(/(?:TZ|ODIN)-[A-Za-z0-9-]+/)?.[0] 
        || (o.payment_intent_id?.startsWith('TZ-') ? o.payment_intent_id : null)
        || (o.payment_intent_id?.startsWith('CHAMP-') ? o.payment_intent_id : null);

      const orderNumber = odinId || (o.id ? o.id.slice(0, 8).toUpperCase() : 'ORD');

      const customerName = [o.customer_firstname, o.customer_lastname].filter(Boolean).join(' ').trim() || 'Client Anonim';
      const customerEmail = o.customer_email || '';
      const customerPhone = o.customer_phone || '';
      const customerCity = o.addr_city || '';

      const rawItems = Array.isArray(o.items) ? o.items : [];
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
          price: Number(item.price) || 0,
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
        isCountable: !isNonCountable,
        currency: (o.currency || 'RON').toUpperCase(),
        totalAmount: orderTotal,
        subtotal: orderSubtotal,
        commissionAmount: commission,
        items
      };
    });

    // Authoritative totals: when real orders exist, calculatedSales reflects non-cancelled orders accurately
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
    const aov = usagesCount > 0 ? Math.round((totalSales / usagesCount) * 100) / 100 : 0;

    const referralLink = `https://www.trenzone.fit/ro?ref=${encodeURIComponent(affiliate.code || '')}`;

    return {
      id: affiliate.id,
      name: affiliate.name,
      email: affiliate.email,
      code: affiliate.code || 'N/A',
      referralLink,
      commission: `${commissionPercent}%`,
      commissionRaw: commissionPercent,
      totalSales: `${totalSales} RON`,
      totalSalesRaw: totalSales,
      totalCommissions: `${totalCommissions} RON`,
      totalCommissionsRaw: totalCommissions,
      pendingPayout: `${pendingPayout} RON`,
      pendingPayoutRaw: pendingPayout,
      paidPayout: `${paidPayout} RON`,
      paidPayoutRaw: paidPayout,
      aov: `${aov} RON`,
      aovRaw: aov,
      usages: usagesCount,
      status: affiliate.status || 'pending',
      requestedAt: affiliate.requested_at ? new Date(affiliate.requested_at).toLocaleDateString('ro-RO') : null,
      activatedAt: affiliate.activated_at ? new Date(affiliate.activated_at).toLocaleDateString('ro-RO') : null,
      socialLinks: affiliate.social_links,
      paymentDetails: {
        iban: paymentDetails.iban || '',
        bankName: paymentDetails.bank_name || paymentDetails.bank || '',
        accountHolder: paymentDetails.account_holder || affiliate.name,
        paidAmount: paidPayout
      },
      orders: mappedOrders,
      history: []
    };
  });

  const activeCount = mappedAffiliates.filter(a => a.status === 'active').length;
  const totalSales = mappedAffiliates.reduce((sum, a) => sum + (a.totalSalesRaw || 0), 0);
  const totalCommissions = mappedAffiliates.reduce((sum, a) => sum + (a.totalCommissionsRaw || 0), 0);

  return {
    affiliates: mappedAffiliates,
    stats: {
      totalSales: Math.round(totalSales * 100) / 100,
      totalCommissions: Math.round(totalCommissions * 100) / 100,
      activeCount
    }
  };
}

export async function recordAffiliatePayoutAction(affiliateId: string, amount: number) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  if (!amount || isNaN(amount) || amount <= 0) {
    return { success: false, error: 'Te rugăm să introduci o sumă validă.' };
  }

  const { data: aff, error: fetchErr } = await supabaseAdmin
    .from('affiliates')
    .select('payment_details, name')
    .eq('id', affiliateId)
    .single();

  if (fetchErr || !aff) return { success: false, error: 'Afiliat negăsit.' };

  const currentDetails = aff.payment_details || {};
  const currentPaid = Number(currentDetails.paid_amount || 0);
  const newPaid = Math.round((currentPaid + amount) * 100) / 100;

  const { error: updateErr } = await supabaseAdmin
    .from('affiliates')
    .update({
      payment_details: {
        ...currentDetails,
        paid_amount: newPaid,
        last_payout_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);

  if (updateErr) return { success: false, error: 'Eroare la actualizarea plății.' };

  return { success: true, newPaid };
}

import { sendAffiliateApprovalEmail } from '@/lib/resend-service';

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

  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  // 1. Ensure coupon exists in `coupons` table
  const { data: existingCoupon } = await supabaseAdmin
    .from('coupons')
    .select('id, code, is_active')
    .eq('code', cleanCode)
    .maybeSingle();

  if (existingCoupon) {
    // If coupon already exists (e.g. created manually), just ensure it's active and has correct value
    await supabaseAdmin
      .from('coupons')
      .update({ is_active: true, value: commission })
      .eq('id', existingCoupon.id);
  } else {
    // Create the new coupon automatically
    await supabaseAdmin
      .from('coupons')
      .insert({
        code: cleanCode,
        type: 'percentage',
        value: commission, // Set coupon value to match commission (or 10)
        usage_limit: null,
        expires_at: null,
        is_active: true,
        used_count: 0,
        created_at: new Date().toISOString()
      });
  }

  // 2. Update affiliate status to active
  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      status: 'active', 
      code: cleanCode,
      commission_percent: commission,
      activated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error("Failed to approve affiliate:", error);
    return { success: false, error: 'A apărut o eroare la aprobarea afiliatului.' };
  }

  // 3. Determine locale from social_links JSON
  const locale = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  
  // Construct login URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trenzone.fit'; 
  const loginUrl = `${baseUrl}/${locale}/affiliate/login`;

  // 4. Send the approval email
  try {
    await sendAffiliateApprovalEmail(affiliate.email, affiliate.name, cleanCode, locale, loginUrl, commission);
  } catch (emailError) {
    console.error("Failed to send approval email, but affiliate was approved:", emailError);
  }

  return { success: true };
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

  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de afiliat poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  // If code is changed, preserve historical orders linked via coupon_id
  if (cleanCode !== affiliate.code) {
    const { data: existingNewCoupon } = await supabaseAdmin
      .from('coupons')
      .select('id')
      .eq('code', cleanCode)
      .maybeSingle();

    const { data: oldCoupon } = affiliate.code
      ? await supabaseAdmin.from('coupons').select('id').eq('code', affiliate.code).maybeSingle()
      : { data: null };

    if (existingNewCoupon) {
      // Target coupon already exists: activate it & update value
      await supabaseAdmin
        .from('coupons')
        .update({ is_active: true, value: commission })
        .eq('id', existingNewCoupon.id);

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
      await supabaseAdmin
        .from('coupons')
        .update({ code: cleanCode, value: commission, is_active: true })
        .eq('id', oldCoupon.id);
    } else {
      // No old coupon existed: create the new coupon
      await supabaseAdmin
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
    }
  } else if (commission !== affiliate.commission_percent) {
    // If only commission changed, also update the coupon value
    await supabaseAdmin.from('coupons').update({ value: commission }).eq('code', cleanCode);
  }

  // Update affiliate
  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ 
      code: cleanCode,
      commission_percent: commission,
    })
    .eq('id', id);

  if (error) {
    return { success: false, error: 'A apărut o eroare la salvarea datelor.' };
  }

  // Determine locale from social_links JSON
  const locale = affiliate.social_links?.locale === 'en' ? 'en' : 'ro';
  
  // Construct login URL
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trenzone.fit'; 
  const loginUrl = `${baseUrl}/${locale}/affiliate/login`;

  // Send update email
  try {
    const { sendAffiliateUpdateEmail } = await import('@/lib/resend-service');
    await sendAffiliateUpdateEmail(affiliate.email, affiliate.name, cleanCode, locale, loginUrl, commission);
  } catch (emailError) {
    console.error("Failed to send update email:", emailError);
  }

  return { success: true };
}

export async function createAdminAffiliate(data: {
  name: string;
  email: string;
  code: string;
  commission: number;
  sendEmail?: boolean;
}) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const cleanEmail = data.email.trim().toLowerCase();
  const cleanCode = data.code.trim().toUpperCase();
  const cleanName = data.name.trim();
  const commission = Number(data.commission) || 10;

  if (!cleanEmail || !cleanCode || !cleanName) {
    return { success: false, error: "Numele, email-ul și codul de reducere sunt obligatorii." };
  }

  if (!/^[A-Z0-9_-]{2,30}$/.test(cleanCode)) {
    return { success: false, error: 'Codul de reducere poate conține doar litere, cifre, liniuță și underscore (2-30 caractere).' };
  }

  // 1. Ensure coupon exists in `coupons` table
  const { data: existingCoupon } = await supabaseAdmin
    .from('coupons')
    .select('id, code, is_active')
    .eq('code', cleanCode)
    .maybeSingle();

  if (!existingCoupon) {
    await supabaseAdmin
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
  } else {
    await supabaseAdmin
      .from('coupons')
      .update({ is_active: true, value: commission })
      .eq('id', existingCoupon.id);
  }

  // 2. Insert or update in `affiliates`
  const { data: existingAffiliate } = await supabaseAdmin
    .from('affiliates')
    .select('id')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingAffiliate) {
    const { error: updateErr } = await supabaseAdmin
      .from('affiliates')
      .update({
        name: cleanName,
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
        requested_at: new Date().toISOString(),
        activated_at: new Date().toISOString()
      });

    if (insertErr) return { success: false, error: insertErr.message };
  }

  // 3. Send welcome / approval email if requested
  if (data.sendEmail !== false) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.trenzone.fit'; 
      const loginUrl = `${baseUrl}/ro/affiliate/login`;
      await sendAffiliateApprovalEmail(cleanEmail, cleanName, cleanCode, 'ro', loginUrl, commission);
    } catch (emailErr) {
      console.warn("Could not send approval email to newly created affiliate:", emailErr);
    }
  }

  return { success: true };
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

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ status: 'rejected' })
    .eq('id', id);

  if (error) {
    console.error("Failed to reject affiliate:", error);
    return { success: false, error: 'A apărut o eroare la respingerea afiliatului.' };
  }
  return { success: true };
}

export async function suspendAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ status: 'suspended' })
    .eq('id', id);

  if (error) {
    console.error("Failed to suspend affiliate:", error);
    return { success: false, error: 'A apărut o eroare la suspendarea afiliatului.' };
  }
  return { success: true };
}

export async function activateAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { error } = await supabaseAdmin
    .from('affiliates')
    .update({ status: 'active' })
    .eq('id', id);

  if (error) {
    console.error("Failed to activate affiliate:", error);
    return { success: false, error: 'A apărut o eroare la activarea afiliatului.' };
  }
  return { success: true };
}

export async function deleteAffiliate(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Neautorizat");

  const { error } = await supabaseAdmin
    .from('affiliates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Failed to delete affiliate:", error);
    return { success: false, error: 'A apărut o eroare la ștergerea afiliatului.' };
  }
  return { success: true };
}
