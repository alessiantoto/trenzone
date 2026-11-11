"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

const AUTHORIZED_FALLBACK_EMAILS = [
  'vladislavmaliuc11@gmail.com',
  'trenzone483@gmail.com',
  'trenzonetech@gmail.com',
  'alessiannew@gmail.com',
];

/**
 * Check if authenticated user is authorized as admin
 * Verifies that the user exists in the admin_users whitelist table and is active.
 */
export async function isAdminAuthorized(): Promise<boolean> {
  // Permite testarea locală fără login real doar dacă este activat explicit
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEV_ADMIN_BYPASS === 'true') {
    return true;
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email) return false;

    const cleanEmail = user.email.toLowerCase().trim();

    // Check whitelist in database
    const { data: adminData, error: dbError } = await supabaseAdmin
      .from('admin_users')
      .select('id, is_active')
      .eq('email', cleanEmail)
      .single();

    if (adminData && adminData.is_active !== false) {
      return true;
    }

    // Fallback if db table issue
    if (dbError && AUTHORIZED_FALLBACK_EMAILS.includes(cleanEmail)) {
      return true;
    }

    return false;
  } catch (error: any) {
    // Permitem erorilor interne Next.js pentru bailout dinamic să treacă fără a fi logate ca erori
    if (error?.digest === 'DYNAMIC_SERVER_USAGE' || error?.message?.includes('Dynamic server usage')) {
      throw error;
    }
    console.error('Eroare autorizare admin:', error);
    return false;
  }
}

/**
 * Server action to verify admin authorization for a given email
 */
export async function verifyAdminEmail(email: string): Promise<boolean> {
  const cleanEmail = email.toLowerCase().trim();
  
  if (AUTHORIZED_FALLBACK_EMAILS.includes(cleanEmail)) {
    return true;
  }

  const { data: adminData } = await supabaseAdmin
    .from('admin_users')
    .select('id, is_active')
    .eq('email', cleanEmail)
    .single();

  return !!(adminData && adminData.is_active !== false);
}

export async function logoutAdmin() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
