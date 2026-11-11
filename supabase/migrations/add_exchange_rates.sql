-- Migration: Add exchange_rates column to global_settings
-- Run this in Supabase SQL Editor

-- Add the exchange_rates JSONB column if it doesn't exist
ALTER TABLE global_settings
ADD COLUMN IF NOT EXISTS exchange_rates JSONB DEFAULT NULL;

-- Seed default rates for the existing row (id=1)
-- 1 RON → X currency
UPDATE global_settings
SET exchange_rates = '{
  "EUR": 0.196,
  "USD": 0.229,
  "GBP": 0.171,
  "PLN": 0.84,
  "HUF": 74.23,
  "CZK": 4.81,
  "SEK": 2.13,
  "NOK": 2.19,
  "CHF": 0.18
}'::jsonb
WHERE id = 1 AND exchange_rates IS NULL;

-- If the row doesn't exist yet, create it
INSERT INTO global_settings (id, maintenance_mode, exchange_rates)
VALUES (1, false, '{
  "EUR": 0.196,
  "USD": 0.229,
  "GBP": 0.171,
  "PLN": 0.84,
  "HUF": 74.23,
  "CZK": 4.81,
  "SEK": 2.13,
  "NOK": 2.19,
  "CHF": 0.18
}')
ON CONFLICT (id) DO NOTHING;
