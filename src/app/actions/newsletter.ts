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

    const cleanEmail = (email || '').replace(/[\r\n]/g, '').trim().toLowerCase().slice(0, 150);
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return { success: false, error: locale === 'en' ? "Invalid email address." : "Adresă de email invalidă." };
    }

    const safeLocale: "ro" | "en" = locale === "en" ? "en" : "ro";
    const safeSource = String(source || "promo-popup").replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || "promo-popup";
    const displayName = (name?.trim() || (safeLocale === 'ro' ? 'TrenZone' : 'Champion')).slice(0, 80);

    // Secondary per-email rate limit to prevent Resend inbox-bombing across rotating IPs
    const { allowed: emailAllowed } = await checkRateLimit(rateLimiters.contact, `nl-email:${cleanEmail}`, 'contact');
    if (!emailAllowed) {
      return {
        success: false,
        error: safeLocale === 'en'
          ? "Please wait a few minutes before subscribing with this email again."
          : "Te rugăm să aștepți câteva minute înainte de a reîncerca cu acest email."
      };
    }

    console.log(`[NEWSLETTER] New subscription attempt from ${safeSource}: ${cleanEmail}`);

    // Use the ADMIN client to bypass RLS and perform upsert (insert or update)
    const { error: dbError } = await supabaseAdmin
      .from("subscribers")
      .upsert(
        { 
          email: cleanEmail, 
          full_name: displayName, 
          locale: safeLocale, 
          source: safeSource,
          is_active: true,
          subscribed_at: new Date().toISOString()
        },
        { onConflict: "email" }
      );

    if (dbError) {
      console.error("[NEWSLETTER ACTION] Database Error:", dbError);
      return { 
        success: false, 
        error: safeLocale === 'en' ? 'Database error while subscribing.' : 'Eroare la salvarea abonării.' 
      };
    } else {
      console.log("[NEWSLETTER ACTION] Successfully saved to database.");
      
      // Dacă s-a abonat, ne asigurăm că îl ștergem din lista de dezabonați (opt-in explicit)
      await supabaseAdmin
        .from('unsubscribed_emails')
        .delete()
        .eq('email', cleanEmail);
    }

    // 2. Trigger Welcome Email via Resend (sends active 5% coupon e.g. TREN5)
    console.log("[NEWSLETTER ACTION] Triggering welcome email...");
    let emailSent = false;
    try {
      await sendWelcomeEmail(cleanEmail, displayName, safeLocale);
      emailSent = true;
      console.log("[NEWSLETTER ACTION] Welcome email sent successfully.");
    } catch (emailErr: any) {
      console.error("[NEWSLETTER ACTION] Email failed but user saved:", emailErr);
    }

    return { success: true, emailSent };
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

    // Add to global blocklist for absolute certainty (both marketing & abandoned cart checks)
    const { error: blockError } = await supabaseAdmin
      .from("unsubscribed_emails")
      .upsert({ email: cleanEmail, marketing: false, created_at: new Date().toISOString() }, { onConflict: "email" });

    if (blockError) {
      console.error("❌ [NEWSLETTER ACTION] Unsubscribe Error (blocklist):", blockError);
      return { success: false, error: isEn ? "Error adding to exclusion list." : "Eroare la adăugarea în lista de excluderi." };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Eroare necunoscută." };
  }
}
