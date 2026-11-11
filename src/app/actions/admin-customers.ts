"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { convertToRon, getServerExchangeRates } from "@/utils/pricing";

export interface EliteCustomer {
  email: string;
  name: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string;
  isSubscriber: boolean;
}

export interface EliteSubscriber {
  email: string;
  full_name: string;
  locale: string;
  source: string;
  subscribed_at: string;
  is_active: boolean;
}

export async function fetchAdminCRMData(query?: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error("Acces neautorizat.");

  // 1. FETCH ALL SUBSCRIBERS
  const { data: subscribers, error: subError } = await supabaseAdmin
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (subError) {
    console.error("❌ [ADMIN CRM] Subscriptions Fetch Error:", subError);
  }

  // 2. FETCH ALL ORDERS TO AGGREGATE CUSTOMERS
  const { data: orders, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('customer_email, customer_firstname, customer_lastname, customer_phone, total_amount, currency, created_at, status')
    .neq('status', 'cancelled'); // Don't count cancelled orders in LTV

  if (orderError) {
    console.error("❌ [ADMIN CRM] Orders Fetch Error:", orderError);
  }

  const liveRates = await getServerExchangeRates();

  // 3. AGGREGATE CUSTOMER PROFILES
  const customerMap = new Map<string, EliteCustomer>();
  const subscriberEmails = new Set(subscribers?.map(s => (s.email || '').toLowerCase()) || []);

  orders?.forEach(order => {
    if (!order.customer_email) return;
    const email = order.customer_email.toLowerCase();
    const existing = customerMap.get(email);
    const amountRon = convertToRon(Number(order.total_amount) || 0, (order as any).currency, liveRates);

    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += amountRon;
      if (new Date(order.created_at) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = order.created_at;
      }
    } else {
      customerMap.set(email, {
        email: order.customer_email,
        name: `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || 'Client',
        phone: order.customer_phone,
        totalOrders: 1,
        totalSpent: amountRon,
        lastOrderDate: order.created_at,
        isSubscriber: subscriberEmails.has(email)
      });
    }
  });

  let customers = Array.from(customerMap.values());
  let filteredSubscribers = (subscribers || []) as EliteSubscriber[];

  // 4. APPLY SEARCH FILTER IF ANY
  if (query) {
    const q = query.toLowerCase();
    customers = customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.email.toLowerCase().includes(q) || 
      c.phone?.includes(q)
    );
    filteredSubscribers = filteredSubscribers.filter(s => 
      s.full_name?.toLowerCase().includes(q) || 
      s.email.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    subscribers: filteredSubscribers,
    customers: customers.sort((a, b) => b.totalSpent - a.totalSpent) // Sort by LTV
  };
}
