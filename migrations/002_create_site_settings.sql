-- CREATE site_settings TABLE
-- Run this in your Supabase SQL editor to create the settings table

CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role (backend) can access site_settings directly
CREATE POLICY "Service role full access" ON public.site_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default active promotion settings if it doesn't exist
INSERT INTO public.site_settings (id, value) 
VALUES (
  'active_promotion', 
  '{
    "isActive": false,
    "endDate": "",
    "couponId": "",
    "image": "",
    "ro": {
      "title": "Summer Sale",
      "description": "Reduceri masive la toate produsele!",
      "badge": "Ofertă Limitată",
      "button": "Cumpără Acum"
    },
    "en": {
      "title": "Summer Sale",
      "description": "Massive discounts on all products!",
      "badge": "Limited Offer",
      "button": "Shop Now"
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
