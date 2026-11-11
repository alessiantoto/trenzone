import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

/**
 * Service-role client for server-side operations that bypass RLS.
 * IMPORTANT: Only use this in 'use server' contexts (Server Actions/APIs).
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
