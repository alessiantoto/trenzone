'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';

export interface EmailLog {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  type: string;
  status: string;
  error_message: string | null;
  metadata: any;
}

export async function getEmailLogs(): Promise<EmailLog[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const { data, error } = await supabaseAdmin
    .from('email_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching email logs:', error);
    return [];
  }
  return data as EmailLog[];
}
