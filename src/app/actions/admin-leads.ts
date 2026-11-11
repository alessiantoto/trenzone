"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";
import { createClient } from "@/utils/supabase/server";

export async function getAdminLeads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) {
    throw new Error(`Acces neautorizat.`);
  }

  const { data, error } = await supabaseAdmin
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false });

  if (error) {
    console.error("❌ [ADMIN LEADS] Fetch Error:", error);
    return [];
  }

  return data.map(lead => ({
    email: lead.email,
    source: lead.source || 'newsletter',
    date: new Date(lead.subscribed_at).toLocaleString('ro-RO', { 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    })
  }));
}
