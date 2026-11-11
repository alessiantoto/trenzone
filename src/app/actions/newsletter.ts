"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendWelcomeEmail } from "@/lib/resend-service";
import { rateLimiters, getClientIpFromHeaders, checkRateLimit } from "@/lib/ratelimit";
import { headers } from "next/headers";

export async function subscribeToNewsletter(
  name: string | undefined,
  email: string,
  locale: "ro" | "en",
  source: string = "promo-popup"
) {
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.newsletter, ip, 'newsletter');
    if (!allowed) {
      return {
        success: false,
        error: locale === 'en'
          ? "Too many attempts. Please wait a few minutes."
          : "Prea multe încercări. Te rugăm să aștepți câteva minute."
      };
    }

    const cleanEmail = (email || '').trim().toLowerCase().slice(0, 150);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: locale === 'en' ? "Invalid email address." : "Adresă de email invalidă." };
    }

    const displayName = (name?.trim() || (locale === 'ro' ? 'TrenZone' : 'Champion')).slice(0, 80);
    console.log(`📩 [NEWSLETTER] New subscription attempt from ${source}: ${cleanEmail} (${displayName})`);

    // Use the ADMIN client to bypass RLS and perform upsert (insert or update)
    const { error: dbError } = await supabaseAdmin
      .from("subscribers")
      .upsert(
        { 
          email: cleanEmail, 
          full_name: displayName, 
          locale, 
          source: source,
          is_active: true,
          subscribed_at: new Date().toISOString()
        },
        { onConflict: "email" }
      );

    if (dbError) {
      console.error("❌ [NEWSLETTER ACTION] Database Error:", dbError);
      return { 
        success: false, 
        error: `Database Error: ${dbError.message || JSON.stringify(dbError)}` 
      };
    } else {
      console.log("✅ [NEWSLETTER ACTION] Successfully saved to database.");
      
      // Dacă s-a abonat, ne asigurăm că îl ștergem din lista de dezabonați (opt-in explicit)
      await supabaseAdmin
        .from('unsubscribed_emails')
        .delete()
        .eq('email', email.toLowerCase().trim());
    }

    // 2. Trigger Welcome Email via Resend
    console.log("📧 [NEWSLETTER ACTION] Triggering welcome email...");
    try {
      await sendWelcomeEmail(email, displayName, locale);
      console.log("✅ [NEWSLETTER ACTION] Welcome email sent successfully.");
    } catch (emailErr: any) {
      console.error("⚠️ [NEWSLETTER ACTION] Email failed but user saved:", emailErr);
      // We don't fail the whole action if email fails after saving to DB
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("❌ [NEWSLETTER ACTION] Failed:", error.message || error);
    return { success: false, error: error.message || "Something went wrong. Please try again." };
  }
}

export async function unsubscribeFromNewsletter(email: string, locale: "ro" | "en" = "ro") {
  const isEn = locale === "en";
  try {
    const headersList = await headers();
    const ip = getClientIpFromHeaders(headersList);
    const { allowed } = await checkRateLimit(rateLimiters.newsletter, `unsub:${ip}`, 'newsletter');
    if (!allowed) {
      return { success: false, error: isEn ? "Too many attempts. Please wait a few minutes." : "Prea multe încercări. Te rugăm să aștepți câteva minute." };
    }

    const cleanEmail = (email || '').toLowerCase().trim().slice(0, 150);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: isEn ? "Invalid email address." : "Adresă de email invalidă." };
    }

    const { error: dbError } = await supabaseAdmin
      .from("subscribers")
      .update({ is_active: false })
      .eq("email", cleanEmail);

    if (dbError) {
      console.error("❌ [NEWSLETTER ACTION] Unsubscribe Error (subscribers):", dbError);
    }

    // Add to global blocklist for absolute certainty
    const { error: blockError } = await supabaseAdmin
      .from("unsubscribed_emails")
      .upsert({ email: cleanEmail, created_at: new Date().toISOString() }, { onConflict: "email" });

    if (blockError) {
      console.error("❌ [NEWSLETTER ACTION] Unsubscribe Error (blocklist):", blockError);
      return { success: false, error: isEn ? "Error adding to exclusion list." : "Eroare la adăugarea în lista de excluderi." };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Eroare necunoscută." };
  }
}
