import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Marks a checkout session as completed on the server (never exposed as a public Server Action).
 */
export async function completeCheckoutSession(paymentIntentId: string | null, email?: string) {
  try {
    if (!paymentIntentId && !email) {
      return { success: false, error: "Either paymentIntentId or email is required" };
    }

    if (!paymentIntentId && email) {
      const cleanEmail = email.trim().toLowerCase();
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentOrder } = await supabaseAdmin
        .from("orders")
        .select("id")
        .ilike("customer_email", cleanEmail.replace(/[%_]/g, ""))
        .gte("created_at", tenMinutesAgo)
        .limit(1)
        .maybeSingle();

      if (!recentOrder) {
        return { success: false, error: "No matching recent order found" };
      }
    }

    let query = supabaseAdmin
      .from("checkout_sessions")
      .update({ status: "completed" });

    if (paymentIntentId) {
      query = query.eq("payment_intent_id", paymentIntentId);
    } else if (email) {
      query = query.eq("email", email.trim().toLowerCase()).eq("status", "initiated");
    }

    const { error } = await query;
    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error("[completeCheckoutSession] Error:", error?.message || error);
    return { success: false, error: error?.message || "Internal error" };
  }
}

