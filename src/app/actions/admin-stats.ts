"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { normalizeCityName } from "@/utils/admin-helpers";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";



export async function fetchAdminBusinessStats() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  try {
    // 1. FETCH ALL SUCCESSFUL ORDERS
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('total_amount, currency, items, created_at, status, addr_city, customer_email')
      .neq('status', 'cancelled');

    if (error) throw error;

    // 2. FETCH ALL CHECKOUT SESSIONS (for abandoned carts)
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('checkout_sessions')
      .select('*');

    if (sessionsError) {
      console.warn("⚠️ [fetchAdminBusinessStats] Could not query checkout_sessions:", sessionsError);
    }

    const validSessions = sessions || [];

    // 3. AGGREGATE DYNAMIC ABANDONED CARTS
    // Sessions in 'initiated' state updated more than 30 minutes ago are considered abandoned
    const nowMs = new Date().getTime();
    const ABANDON_TIMEOUT_MS = 30 * 60 * 1000;

    const abandonedSessions = validSessions.filter(s => 
      s.status === 'initiated' && 
      (nowMs - new Date(s.updated_at).getTime()) > ABANDON_TIMEOUT_MS
    );

    const abandonedCount = abandonedSessions.length;
    const abandonedRevenue = abandonedSessions.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0);
    const totalInitiatedCount = orders.length + abandonedCount;
    const abandonmentRate = totalInitiatedCount > 0 ? (abandonedCount / totalInitiatedCount) * 100 : 0;

    const recentAbandonedCarts = abandonedSessions
      .map(s => ({
        id: s.id,
        email: s.email,
        phone: s.phone,
        firstName: s.first_name,
        lastName: s.last_name,
        items: s.items,
        totalAmount: s.total_amount,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 15);

    const liveRates = await getServerExchangeRates();

    // 4. AGGREGATE BUSINESS METRICS (converted to RON)
    const totalRevenue = orders.reduce((acc, curr) => acc + convertToRon(Number(curr.total_amount) || 0, (curr as any).currency || 'RON', liveRates), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 5. CALCULATE RETURNING CUSTOMER RATE
    const customerOrderCounts = new Map<string, number>();
    orders.forEach(o => {
      if (o.customer_email) {
        const emailClean = o.customer_email.trim().toLowerCase();
        customerOrderCounts.set(emailClean, (customerOrderCounts.get(emailClean) || 0) + 1);
      }
    });
    const uniqueCustomersCount = customerOrderCounts.size;
    const returningCustomersCount = Array.from(customerOrderCounts.values()).filter(count => count >= 2).length;
    const returningCustomerRate = uniqueCustomersCount > 0 ? (returningCustomersCount / uniqueCustomersCount) * 100 : 0;

    // 6. AGGREGATE LIQUID CHALK SCENT LEADERBOARD
    const scentSales = {
      lemon: 0,
      orange: 0,
      mint: 0,
      unscented: 0
    };

    orders.forEach(order => {
      const items = order.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const rawName = typeof item.name === 'object' && item.name !== null
            ? (item.name.ro || item.name.en || Object.values(item.name)[0] || "")
            : (item.name || "");
          const rawVariant = item.selectedVariant?.name || item.variant || "";
          const variantStr = typeof rawVariant === 'object' && rawVariant !== null
            ? (rawVariant.ro || rawVariant.en || Object.values(rawVariant)[0] || "")
            : rawVariant;
          const nameLower = String(rawName).toLowerCase();
          const variantLower = String(variantStr).toLowerCase();
          
          if (nameLower.includes("chalk") || nameLower.includes("cretă") || nameLower.includes("creta")) {
            if (variantLower.includes("lemon") || variantLower.includes("lămâie") || variantLower.includes("lamaie") || nameLower.includes("lemon") || nameLower.includes("lămâie")) {
              scentSales.lemon += item.quantity || 1;
            } else if (variantLower.includes("orange") || variantLower.includes("portocal") || nameLower.includes("orange") || nameLower.includes("portocal")) {
              scentSales.orange += item.quantity || 1;
            } else if (variantLower.includes("mint") || variantLower.includes("mentă") || variantLower.includes("menta") || nameLower.includes("mint") || nameLower.includes("mentă")) {
              scentSales.mint += item.quantity || 1;
            } else {
              scentSales.unscented += item.quantity || 1;
            }
          }
        });
      }
    });

    const scentPerformance = [
      { name: "Lemon / Lămâie", count: scentSales.lemon },
      { name: "Orange / Portocale", count: scentSales.orange },
      { name: "Mint / Mentă", count: scentSales.mint },
      { name: "Unscented / Fără parfum", count: scentSales.unscented }
    ].sort((a, b) => b.count - a.count);

    // 7. AGGREGATE BEST SELLERS
    const productSales = new Map<string, { count: number, revenue: number, image?: string }>();
    
    orders.forEach(order => {
      const items = order.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const itemName = typeof item.name === 'object' && item.name !== null
            ? String(item.name.ro || item.name.en || Object.values(item.name)[0] || 'Produs')
            : String(item.name || 'Produs');
          const qty = Number(item.quantity) || 1;
          const unitPriceRon = convertToRon(Number(item.price) || 0, (order as any).currency);
          const existing = productSales.get(itemName);
          if (existing) {
            existing.count += qty;
            existing.revenue += (unitPriceRon * qty);
          } else {
            productSales.set(itemName, {
              count: qty,
              revenue: (unitPriceRon * qty),
              image: item.image
            });
          }
        });
      }
    });

    const bestSellers = Array.from(productSales.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 8. TREND CALCULATION (Last 7 days vs previous 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const last7DaysOrders = orders.filter(o => new Date(o.created_at) >= sevenDaysAgo);
    const prev7DaysOrders = orders.filter(o => new Date(o.created_at) < sevenDaysAgo && new Date(o.created_at) >= fourteenDaysAgo);

    const last7DaysRev = last7DaysOrders.reduce((acc, curr) => acc + convertToRon(Number(curr.total_amount) || 0, (curr as any).currency || 'RON'), 0);
    const prev7DaysRev = prev7DaysOrders.reduce((acc, curr) => acc + convertToRon(Number(curr.total_amount) || 0, (curr as any).currency || 'RON'), 0);

    const revenueGrowth = prev7DaysRev > 0 ? ((last7DaysRev - prev7DaysRev) / prev7DaysRev) * 100 : 0;

    // 9. AGGREGATE TOP CITIES
    const citySales = new Map<string, { count: number, revenue: number }>();
    orders.forEach(o => {
      if (o.addr_city) {
        const cityName = normalizeCityName(o.addr_city);
        const orderRevRon = convertToRon(Number(o.total_amount) || 0, (o as any).currency || 'RON');
        const existing = citySales.get(cityName);
        if (existing) {
          existing.count += 1;
          existing.revenue += orderRevRon;
        } else {
          citySales.set(cityName, { count: 1, revenue: orderRevRon });
        }
      }
    });

    const topCities = Array.from(citySales.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      success: true,
      business: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        revenueGrowth,
        bestSellers,
        topCities,
        abandonedCount,
        abandonedRevenue,
        abandonmentRate,
        recentAbandonedCarts,
        returningCustomerRate,
        scentPerformance
      }
    };
  } catch (error: any) {
    console.error("❌ [ADMIN STATS ACTION] Error:", error);
    return { success: false, error: error.message };
  }
}
