"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { headers } from "next/headers";
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from "@/lib/ratelimit";

/**
 * TRACK CHECKOUT SESSION (GDPR Compliant)
 * Saves or updates checkout progress when a user moves beyond Step 1.
 */
export async function trackCheckoutSession(data: {
  paymentIntentId?: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  shippingType?: string;
  carrierId?: string;
  branchId?: string;
  branchName?: string;
  items: any[];
  totalAmount: number;
  currency: string;
}) {
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.checkoutUpdate, `track:${ip}`, 'checkoutUpdate');
    if (!allowed) {
      return { success: false, error: "Too many requests" };
    }

    if (!data.email) {
      return { success: false, error: "Email is required" };
    }

    const emailClean = data.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return { success: false, error: "Invalid email" };
    }
    const payload = {
      payment_intent_id: data.paymentIntentId || null,
      email: emailClean,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      phone: data.phone.trim(),
      line1: data.line1.trim(),
      line2: data.line2?.trim() || null,
      city: data.city.trim(),
      state: data.state?.trim() || null,
      postal_code: data.postalCode.trim(),
      country: data.country,
      shipping_type: data.shippingType || null,
      carrier_id: data.carrierId ? String(data.carrierId) : null,
      branch_id: data.branchId ? String(data.branchId) : null,
      branch_name: data.branchName || null,
      items: data.items,
      total_amount: data.totalAmount,
      currency: data.currency || "RON",
      status: "initiated"
    };

    // 1. If we have a paymentIntentId, upsert by payment_intent_id
    if (payload.payment_intent_id) {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("checkout_sessions")
        .select("id, status, email")
        .eq("payment_intent_id", payload.payment_intent_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If the session was already completed, do not revert it to initiated
      if (existing?.status === 'completed') {
        return { success: true, message: "Session already completed" };
      }

      if (existing) {
        if (existing.email && existing.email.toLowerCase() !== emailClean) {
          return { success: false, error: "Session email mismatch" };
        }
        const { error: updateError } = await supabaseAdmin
          .from("checkout_sessions")
          .update(payload)
          .eq("id", existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("checkout_sessions")
          .insert(payload);
        if (insertError) throw insertError;
      }
    } else {
      // 2. Otherwise, upsert by email + status='initiated' to avoid duplicate spamming
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from("checkout_sessions")
        .select("id")
        .eq("email", emailClean)
        .eq("status", "initiated")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from("checkout_sessions")
          .update(payload)
          .eq("id", existing[0].id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("checkout_sessions")
          .insert(payload);
        if (insertError) throw insertError;
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ [trackCheckoutSession] Error:", error.message || error);
    return { success: false, error: error.message || "Eroare internă la salvarea coșului." };
  }
}
