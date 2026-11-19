import { supabaseAdmin } from "@/lib/supabase-admin";
import { resend, logEmailToDb } from "@/lib/resend-service";
import { AbandonedCartEmail } from "@/components/email/AbandonedCartEmail";
import { getEmailTemplate } from "@/app/actions/email-templates";
import { getSiteUrl, getResendFromEmail } from "@/lib/site-config";
import { getProductPrice, getServerExchangeRates, normalizeCartItemsCurrency } from "@/utils/pricing";

export interface NormalizedAbandonedCartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  selectedVariant?: any;
}

export function parseSessionItemsArray(rawItems: any): any[] {
  if (typeof rawItems === "string") {
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(rawItems) ? rawItems : [];
}

export function buildNormalizedAbandonedItems(
  rawItems: any,
  sessionCurrency: string,
  expectedTotal: any,
  liveRates?: Record<string, number>
): NormalizedAbandonedCartItem[] {
  const parsed = parseSessionItemsArray(rawItems);
  const preNormalized = parsed.map((item: any, idx: number) => {
    let priceNum = 0;
    if (typeof item?.price === "number") {
      priceNum = item.price;
    } else if (item?.price && typeof item.price === "object") {
      priceNum = getProductPrice(item.price, sessionCurrency, liveRates);
    } else {
      priceNum = parseFloat(String(item?.price || 0)) || 0;
    }

    return {
      id: String(item?.id || `item-${idx}`),
      name:
        typeof item?.name === "object" && item.name !== null
          ? item.name.ro || item.name.en || "Produs"
          : String(item?.name || "Produs"),
      quantity: Math.max(1, Number(item?.quantity) || 1),
      price: Number(priceNum) || 0,
      image: item?.image || item?.selectedVariant?.image || undefined,
      selectedVariant: item?.selectedVariant || null,
    };
  });

  return normalizeCartItemsCurrency(
    preNormalized,
    sessionCurrency,
    expectedTotal,
    liveRates
  );
}

export function resolveAbandonedCartLocale(session: any): "ro" | "en" {
  const rawSessionLocale = String(session?.locale || session?.metadata?.locale || "").toLowerCase();
  if (rawSessionLocale.startsWith("en")) return "en";
  if (rawSessionLocale.startsWith("ro")) return "ro";
  return !session?.country || session.country === "RO" ? "ro" : "en";
}

export async function executeAbandonedCartsRecovery() {
  const now = new Date();
  const lowerBound = new Date(now.getTime() - 120 * 60 * 60 * 1000);
  const upperBound = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data: sessions, error } = await supabaseAdmin
    .from("checkout_sessions")
    .select("*")
    .eq("status", "initiated")
    .not("email", "is", null)
    .neq("email", "")
    .gte("created_at", lowerBound.toISOString())
    .lte("created_at", upperBound.toISOString())
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  if (!sessions || sessions.length === 0) {
    return {
      success: true,
      processed: 0,
      uniqueCustomers: 0,
      emailsSent: 0,
      emailsSent24h: 0,
      emailsSent72h: 0,
      message: "Nu există coșuri abandonate eligibile în fereastra de 24h - 120h.",
    };
  }

  // Group all sessions by normalized customer email so each customer gets at most 1 email per stage
  const groupedByEmail = new Map<string, any[]>();
  for (const session of sessions) {
    const emailObj = String(session.email || "").toLowerCase().trim();
    if (!emailObj || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailObj)) continue;
    const list = groupedByEmail.get(emailObj) || [];
    list.push(session);
    groupedByEmail.set(emailObj, list);
  }

  if (groupedByEmail.size === 0) {
    return {
      success: true,
      processed: sessions.length,
      uniqueCustomers: 0,
      emailsSent: 0,
      emailsSent24h: 0,
      emailsSent72h: 0,
      message: "Nu există coșuri abandonate cu email valid în fereastra de 24h - 120h.",
    };
  }

  const candidateEmails = Array.from(groupedByEmail.keys());

  const [
    template24h,
    template72h,
    liveRates,
    setting72hRes,
    unsubRes,
    recentOrdersRes,
  ] = await Promise.all([
    getEmailTemplate("abandoned_24h"),
    getEmailTemplate("abandoned_72h"),
    getServerExchangeRates().catch(() => undefined),
    supabaseAdmin.from("store_settings").select("value").eq("key", "abandoned_72h_coupon").maybeSingle(),
    supabaseAdmin.from("unsubscribed_emails").select("email, marketing").in("email", candidateEmails),
    supabaseAdmin
      .from("orders")
      .select("id, customer_email, created_at")
      .gte("created_at", lowerBound.toISOString()),
  ]);

  const couponCode72h = String(setting72hRes.data?.value || "TREN10").trim().toUpperCase() || "TREN10";
  const { data: couponData72h } = await supabaseAdmin
    .from("coupons")
    .select("value")
    .eq("code", couponCode72h)
    .maybeSingle();
  const couponValue72h = Number(couponData72h?.value) || 10;

  const optedOutEmails = new Set<string>();
  for (const row of unsubRes.data || []) {
    if (row?.marketing === false && row?.email) {
      optedOutEmails.add(String(row.email).toLowerCase().trim());
    }
  }

  const latestOrderByEmail = new Map<string, number>();
  for (const ord of recentOrdersRes.data || []) {
    const e = String(ord?.customer_email || "").toLowerCase().trim();
    if (!e || !ord?.created_at) continue;
    const ts = new Date(ord.created_at).getTime();
    if (ts > (latestOrderByEmail.get(e) || 0)) {
      latestOrderByEmail.set(e, ts);
    }
  }

  let emailsSent = 0;
  let emailsSent24h = 0;
  let emailsSent72h = 0;
  const siteUrl = getSiteUrl();

  for (const [emailObj, customerSessions] of groupedByEmail.entries()) {
    if (optedOutEmails.has(emailObj)) {
      continue;
    }

    const earliestSessionTs = Math.min(
      ...customerSessions.map((s) => new Date(s.created_at).getTime())
    );
    const latestOrderTs = latestOrderByEmail.get(emailObj) || 0;
    if (latestOrderTs >= earliestSessionTs) {
      const idsToRecover = customerSessions.map((s) => s.id);
      await supabaseAdmin
        .from("checkout_sessions")
        .update({ status: "recovered" })
        .in("id", idsToRecover);
      continue;
    }

    // Check if ANY sibling session for this customer already received 24h or 72h
    const alreadySent24h = customerSessions.some((s) => Boolean(s.recovery_emails_sent?.["24h"]));
    const alreadySent72h = customerSessions.some((s) => Boolean(s.recovery_emails_sent?.["72h"]));

    // Pick newest session with items (already sorted newest-first)
    const primarySession =
      customerSessions.find((s) => parseSessionItemsArray(s.items).length > 0) || customerSessions[0];
    if (!primarySession) continue;

    const sessionDate = new Date(primarySession.updated_at || primarySession.created_at);
    const hoursSince = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);

    let templateToUse = null;
    let emailType: "24h" | "72h" | "" = "";

    if (hoursSince >= 72 && !alreadySent72h) {
      templateToUse = template72h;
      emailType = "72h";
    } else if (hoursSince >= 24 && hoursSince < 72 && !alreadySent24h) {
      templateToUse = template24h;
      emailType = "24h";
    }

    if (!templateToUse || !emailType) {
      continue;
    }

    const locale = resolveAbandonedCartLocale(primarySession);
    const customerName = String(primarySession.first_name || "").trim();
    const firstName = customerName ? customerName.split(/\s+/)[0] : "";
    const baseSubject = locale === "en" ? templateToUse.subject_en : templateToUse.subject_ro;
    const default24hSubject =
      locale === "en" ? "You left items in your TrenZone cart" : "Ai lăsat produse în coșul tău TrenZone";
    const default72hSubject =
      locale === "en"
        ? `Final reminder for your cart — ${couponValue72h}% off with ${couponCode72h}`
        : `Ultim memento pentru coșul tău — ${couponValue72h}% reducere cu ${couponCode72h}`;

    const finalSubject = (baseSubject || (emailType === "72h" ? default72hSubject : default24hSubject))
      .replace(/\{\{name\}\}/g, firstName)
      .replace(/\{\{coupon\}\}/g, couponCode72h)
      .replace(/\{\{value\}\}/g, String(couponValue72h))
      .replace(/,\s*([.!?])/g, "$1")
      .replace(/\s+,/g, ",")
      .trim();

    const sessionCurrency =
      String(primarySession.currency || (locale === "ro" ? "RON" : "EUR")).toUpperCase().trim() || "RON";
    const normalizedItems = buildNormalizedAbandonedItems(
      primarySession.items,
      sessionCurrency,
      primarySession.total_amount,
      liveRates
    );

    if (normalizedItems.length === 0) {
      continue;
    }

    const cartUrl = `${siteUrl}/${locale}/checkout${
      emailType === "72h" ? `?coupon=${encodeURIComponent(couponCode72h)}` : ""
    }`;

    try {
      const resendResult = await resend.emails.send({
        from: getResendFromEmail(),
        to: emailObj,
        subject: finalSubject,
        react: AbandonedCartEmail({
          customerName,
          items: normalizedItems,
          locale,
          baseUrl: siteUrl,
          currency: sessionCurrency,
          cartUrl,
          templateData: templateToUse as any,
          userEmail: emailObj,
          couponCode: emailType === "72h" ? couponCode72h : undefined,
          couponValue: emailType === "72h" ? couponValue72h : undefined,
        }) as any,
      });

      if (resendResult.error) {
        throw new Error(resendResult.error.message || "Resend error");
      }

      const sentAtIso = new Date().toISOString();
      await Promise.all(
        customerSessions.map((s) => {
          const updatedSent: Record<string, any> = {
            ...(s.recovery_emails_sent || {}),
            [emailType]: true,
            [`${emailType}_sent_at`]: sentAtIso,
            automated: true,
          };
          if (emailType === "72h") {
            updatedSent.last_coupon_code = couponCode72h;
            updatedSent.last_coupon_value = couponValue72h;
          }
          if (s.id !== primarySession.id) {
            updatedSent.deduped_with = primarySession.id;
          }
          return supabaseAdmin
            .from("checkout_sessions")
            .update({ recovery_emails_sent: updatedSent })
            .eq("id", s.id);
        })
      );

      await logEmailToDb(
        emailObj,
        finalSubject,
        `abandoned-${emailType}`,
        "sent",
        null,
        { sessionId: primarySession.id, couponCode: emailType === "72h" ? couponCode72h : null }
      );

      emailsSent++;
      if (emailType === "24h") emailsSent24h++;
      if (emailType === "72h") emailsSent72h++;

      // Stay safely below Resend's 2 req/sec limit
      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (emailErr: any) {
      const errMsg = emailErr?.message || String(emailErr);
      console.error(`Failed to send ${emailType} email to ${emailObj}:`, errMsg);
      await logEmailToDb(
        emailObj,
        finalSubject,
        `abandoned-${emailType}`,
        "failed",
        errMsg,
        { sessionId: primarySession.id }
      );
    }
  }

  return {
    success: true,
    processed: sessions.length,
    uniqueCustomers: groupedByEmail.size,
    emailsSent,
    emailsSent24h,
    emailsSent72h,
    message: `Procesat cu succes: ${emailsSent} emailuri trimise (${emailsSent24h} de 24h, ${emailsSent72h} de 72h cu ${couponValue72h}% reducere).`,
  };
}

