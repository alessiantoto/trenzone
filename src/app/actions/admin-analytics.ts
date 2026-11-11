"use server";

import { getBasicAnalytics, getTopKeywords } from "@/lib/ga4";
import { isAdminAuthorized } from "./admin-auth";
import { fetchAdminBusinessStats } from "./admin-stats";

/**
 * ELITE ADMIN ANALYTICS ACTION
 * Fetches real GA4 data (if available) and Supabase business stats.
 * Resilient to GA4 connection failures.
 */
export async function fetchAdminAnalytics() {
  const isAuthorized = await isAdminAuthorized();

  if (!isAuthorized) {
    throw new Error("Acces neautorizat. Te rugăm să te loghezi în Admin Console.");
  }

  let analyticsData = null;
  let analyticsLive = false;
  let keywords = null;

  // 1. ATTEMPT GA4 FETCH (Fail-safe)
  try {
    analyticsData = await getBasicAnalytics();
    analyticsLive = analyticsData !== null;
    if (analyticsLive) {
      keywords = await getTopKeywords();
    }
  } catch (error) {
    console.warn("⚠️ [GA4] Analytics service unavailable. Falling back to business data only.");
    analyticsLive = false;
  }

  // 2. FETCH BUSINESS STATS (Required)
  try {
    const businessStats = await fetchAdminBusinessStats();
    
    const hasRealConfig = !!(
      process.env.GA4_PROPERTY_ID && 
      process.env.GA4_CLIENT_EMAIL && 
      process.env.GA4_PRIVATE_KEY
    );

    return {
      success: true,
      data: analyticsData ? {
        ...analyticsData,
        keywords
      } : null,
      business: businessStats?.business || null,
      analyticsLive,
      isReal: hasRealConfig,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("❌ [ADMIN ANALYTICS ACTION] Critical Business Data Error:", error.message);
    return {
      success: false,
      error: "Nu s-au putut prelua datele vitale de business din Supabase.",
      isReal: false
    };
  }
}
