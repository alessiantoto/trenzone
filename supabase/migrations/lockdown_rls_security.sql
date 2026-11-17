-- ============================================================================
-- Migration: Comprehensive Supabase RLS Security Lockdown
-- Purpose:
--   1. Completely block `anon` and non-service-role `authenticated` access
--      (REST API / PostgREST via NEXT_PUBLIC_SUPABASE_ANON_KEY) from all
--      private, PII, financial, coupon, admin, and config tables.
--   2. Allow strictly read-only public access ONLY to:
--        - `public.products` WHERE `is_active = true`
--        - `public.reviews` WHERE `status = 'approved'`
--        - `public.categories` (if present, read-only)
--   3. Preserve full server-side access for `service_role` (`supabaseAdmin`).
--   4. Fully idempotent — safe to run multiple times in Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Lock down all private / PII / operational / config tables
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  pol RECORD;
  private_tables TEXT[] := ARRAY[
    'orders',
    'checkout_sessions',
    'coupons',
    'influencers',
    'subscribers',
    'newsletter_subscribers',
    'contact_messages',
    'returns',
    'email_logs',
    'email_templates',
    'email_broadcasts',
    'store_settings',
    'global_settings',
    'admin_users',
    'affiliates',
    'unsubscribed_emails',
    'scratch_tickets',
    'shipping_rates',
    'reviews'
  ];
BEGIN
  FOREACH tbl IN ARRAY private_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND table_type = 'BASE TABLE'
    ) THEN
      -- Drop every existing policy (including overly permissive public policies)
      FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;

      -- Enable Row Level Security
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      -- Revoke all privileges from public, anon, and authenticated roles
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);

      -- Ensure service_role retains full access
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl);

      -- Explicit service_role-only policy (defense in depth)
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        'service_role_full_access_' || tbl,
        tbl
      );
    END IF;
  END LOOP;
END
$$;

-- ----------------------------------------------------------------------------
-- 2. Controlled Public Read-Only: `products` (only active products)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND table_type = 'BASE TABLE'
  ) THEN
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'products'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
    END LOOP;

    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.products FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON TABLE public.products TO anon, authenticated;
    GRANT ALL ON TABLE public.products TO service_role;

    CREATE POLICY "public_read_active_products"
      ON public.products
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);

    CREATE POLICY "service_role_full_access_products"
      ON public.products
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- `reviews` is locked down in `private_tables` above (contains reviewer emails;
-- all storefront reads use `/api/reviews` & `public-reviews.ts` via `service_role`).

-- ----------------------------------------------------------------------------
-- 4. Controlled Public Read-Only: `categories` (if present, no writes)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND table_type = 'BASE TABLE'
  ) THEN
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'categories'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.categories', pol.policyname);
    END LOOP;

    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

    REVOKE ALL ON TABLE public.categories FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON TABLE public.categories TO anon, authenticated;
    GRANT ALL ON TABLE public.categories TO service_role;

    CREATE POLICY "public_read_categories"
      ON public.categories
      FOR SELECT
      TO anon, authenticated
      USING (true);

    CREATE POLICY "service_role_full_access_categories"
      ON public.categories
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

COMMIT;
