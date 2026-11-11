"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from "@/lib/ratelimit";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping';

export interface CouponData {
  id?: string;
  code: string;
  type: DiscountType;
  value: number;
  usage_limit: number | null;
  expiry_date: string | null;
  is_active?: boolean;
  used_count?: number;
}

/**
 * FETCH ALL COUPONS
 * Synchronized with the elite multi-type schema.
 */
export async function getCoupons() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  const { data, error } = await supabaseAdmin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ Error fetching coupons:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    ...c,
    expiry_date: c.expires_at || c.expiry_date || null,
    used_count: c.used_count ?? c.times_used ?? 0,
  }));
}

/**
 * CREATE A NEW COUPON
 * Supports Percentage, Fixed Amount, and Free Shipping.
 */
export async function createCoupon(data: Omit<CouponData, 'id' | 'used_count' | 'is_active'>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  if (!data || !data.code || typeof data.code !== "string") {
    return { success: false, error: "Datele cuponului sunt invalide." };
  }

  const { error } = await supabaseAdmin
    .from('coupons')
    .insert({
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.type === 'free_shipping' ? 0 : data.value,
      usage_limit: data.usage_limit || null,
      expires_at: data.expiry_date || null, // Linked to the expires_at column in schema
      is_active: true,
      used_count: 0,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error("❌ Error creating coupon:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing');
  return { success: true };
}

/**
 * UPDATE AN EXISTING COUPON
 */
export async function updateCoupon(id: string, data: Omit<CouponData, 'id' | 'used_count' | 'is_active'>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  if (!id || !data || !data.code || typeof data.code !== "string") {
    return { success: false, error: "Datele cuponului sunt invalide." };
  }

  const { error } = await supabaseAdmin
    .from('coupons')
    .update({
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.type === 'free_shipping' ? 0 : data.value,
      usage_limit: data.usage_limit || null,
      expires_at: data.expiry_date || null
    })
    .eq('id', id);

  if (error) {
    console.error("❌ Error updating coupon:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing');
  return { success: true };
}

/**
 * VALIDATE A COUPON FOR CHECKOUT
 * Used on the client side to apply discounts.
 */
export async function validateCoupon(code: string, subtotal: number = 0, currency: string = 'RON', locale: string = 'ro') {
  const isEn = locale === 'en';
  try {
    if (!code || typeof code !== "string") {
      return { isValid: false, message: isEn ? 'The discount code is not valid.' : 'Codul de reducere nu este valid.' };
    }

    try {
      const headersList = await headers();
      const ip = getClientIpFromHeaders(headersList);
      const { allowed } = await checkRateLimit(rateLimiters.checkoutUpdate, ip, 'validate-coupon');
      if (!allowed) {
        return { isValid: false, message: isEn ? 'Too many attempts. Please wait a moment before trying again.' : 'Prea multe încercări. Așteaptă puțin înainte de a reîncerca.' };
      }
    } catch {
      // Ignore outside request context
    }

    const cleanCode = code.trim().toUpperCase().slice(0, 50);
    const { data: coupon, error } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', cleanCode)
      .single();

    if (error || !coupon) {
      return { isValid: false, message: isEn ? 'The discount code is not valid.' : 'Codul de reducere nu este valid.' };
    }

    if (!coupon.is_active) {
      return { isValid: false, message: isEn ? 'The discount code is not active.' : 'Codul de reducere nu este activ.' };
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return { isValid: false, message: isEn ? 'The discount code has reached its usage limit.' : 'Codul de reducere și-a atins limita de utilizări.' };
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { isValid: false, message: isEn ? 'The discount code has expired.' : 'Codul de reducere a expirat.' };
    }

    const liveRates = await getServerExchangeRates();
    const subtotalInRon = convertToRon(subtotal, currency, liveRates);
    if (coupon.min_purchase && subtotalInRon < coupon.min_purchase) {
      return { isValid: false, message: isEn ? `Minimum order value for this code is ${coupon.min_purchase} RON.` : `Valoarea minimă a comenzii pentru acest cod este de ${coupon.min_purchase} RON.` };
    }

    return { isValid: true, coupon };
  } catch (error) {
    console.error("❌ Error validating coupon:", error);
    return { isValid: false, message: isEn ? 'Error validating the code.' : 'Eroare la validarea codului.' };
  }
}

/**
 * DELETE A COUPON
 */
export async function deleteCoupon(id: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  if (!id) {
    return { success: false, error: "ID invalid." };
  }

  const { error } = await supabaseAdmin
    .from('coupons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("❌ Error deleting coupon:", error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/coupons');
  revalidatePath('/admin/marketing');
  return { success: true };
}

/**
 * TOGGLE COUPON STATUS (ACTIVATE/DEACTIVATE)
 */
export async function toggleCouponStatus(id: string, currentStatus: boolean) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  if (!id) throw new Error("ID invalid.");

  const { error } = await supabaseAdmin
    .from("coupons")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/admin/coupons");
  revalidatePath("/admin/marketing");
}

/**
 * GENERATE A DYNAMIC SCRATCH COUPON
 * Win probability:
 * 60% chance -> 5% discount
 * 20% chance -> 7% discount
 * 20% chance -> 10% discount
 */
export async function generateScratchCoupon() {
  try {
    const cookieStore = await cookies();
    const existingScratch = cookieStore.get('tz_scratch_coupon')?.value;
    if (existingScratch) {
      try {
        const parsed = JSON.parse(Buffer.from(existingScratch, 'base64').toString('utf8'));
        if (parsed?.code && parsed?.value) {
          return { success: true, code: parsed.code, value: parsed.value };
        }
      } catch {
        // Proceed to generate
      }
    }

    try {
      const headersList = await headers();
      const ip = getClientIpFromHeaders(headersList);
      const { allowed } = await checkRateLimit(rateLimiters.affiliateLogin, ip, 'scratch-coupon');
      if (!allowed) {
        return { success: false, error: 'Ai generat deja un cupon. Te rugăm să aștepți.' };
      }
    } catch {
      // Ignore outside request context
    }

    const rand = crypto.randomInt(0, 100);
    let discountValue = 5;

    if (rand < 20) {
      discountValue = 10;
    } else if (rand < 40) {
      discountValue = 7;
    } else {
      discountValue = 5;
    }

    // Generate cryptographically random unique code: SCRATCH-XXXXXXX
    const randomStr = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `SCRATCH-${randomStr}`;

    // Valid for 24 hours
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);

    const { error } = await supabaseAdmin
      .from('coupons')
      .insert({
        code,
        type: 'percentage',
        value: discountValue,
        usage_limit: 1,
        expires_at: expiryDate.toISOString(),
        is_active: true,
        used_count: 0,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error("❌ Error generating scratch coupon:", error);
      return { success: false, error: 'Nu am putut genera cuponul.' };
    }

    try {
      cookieStore.set(
        'tz_scratch_coupon',
        Buffer.from(JSON.stringify({ code, value: discountValue })).toString('base64'),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24, // 24 hours
          path: '/',
        }
      );
    } catch {
      // Ignore cookie write errors
    }

    return { success: true, code, value: discountValue };
  } catch (err) {
    console.error("❌ Exception generating scratch coupon:", err);
    return { success: false, error: 'Eroare server.' };
  }
}
