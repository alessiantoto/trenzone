"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { isAdminAuthorized } from "./admin-auth";

export async function getAdminUsers() {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error fetching admin users:", error);
    return [];
  }
  return data || [];
}

export async function addAdminUser(email: string, fullName: string) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .insert({
      email: cleanEmail,
      full_name: fullName,
      role: 'admin',
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding admin:", error);
    throw new Error(error.message);
  }

  // Asigură crearea contului în Supabase Auth cu parola standard
  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = usersData?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
    if (!existing) {
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: 'milionar2028tren',
        email_confirm: true,
        user_metadata: { role: 'admin', full_name: fullName }
      });
    }
  } catch (authErr) {
    console.warn("Could not create Supabase Auth user:", authErr);
  }

  return data;
}

export async function removeAdminUser(id: string) {
  const isAuth = await isAdminAuthorized();
  if (!isAuth) throw new Error("Unauthorized");

  const { error } = await supabaseAdmin
    .from('admin_users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error removing admin:", error);
    throw new Error(error.message);
  }
  return true;
}
