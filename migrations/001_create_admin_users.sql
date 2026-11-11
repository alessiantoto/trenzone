-- CREATE admin_users TABLE
-- Run this in your Supabase SQL editor to set up the admin authorization system

CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (backend) can access admin_users
CREATE POLICY "Service role full access" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Insert your initial admin users
-- IMPORTANT: Replace emails with your actual admin emails
INSERT INTO public.admin_users (email, full_name, role) 
VALUES 
  ('alessiannew@gmail.com', 'Admin User', 'super_admin'),
  ('alessiantoto@gmail.com', 'Admin User', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Verify the table was created
SELECT COUNT(*) as admin_count FROM public.admin_users WHERE is_active = true;
