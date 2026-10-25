import * as fs from 'fs';
import { categories, allMenuItems } from '../src/data/menuData';

const sql = `-- ====================================================================
-- L'Walida Pastry & Coffee Shop - Supabase Database Schema
-- Project URL: https://kyybplhoanqumlvxqmys.supabase.co
-- Description: Product & Category Availability Management with RLS & Realtime
-- ====================================================================

-- 1. Create table for Category Availability
CREATE TABLE IF NOT EXISTS public.category_availability (
  category_id TEXT PRIMARY KEY,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create table for Product Availability
CREATE TABLE IF NOT EXISTS public.product_availability (
  product_id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by category
CREATE INDEX IF NOT EXISTS idx_product_availability_category_id 
  ON public.product_availability(category_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.category_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_availability ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies to avoid duplicates on re-run
DROP POLICY IF EXISTS "Public read category_availability" ON public.category_availability;
DROP POLICY IF EXISTS "Public read product_availability" ON public.product_availability;
DROP POLICY IF EXISTS "Authenticated write category_availability" ON public.category_availability;
DROP POLICY IF EXISTS "Authenticated write product_availability" ON public.product_availability;

-- 5. Row Level Security Policies
-- Public visitors (anon + authenticated) can READ availability
CREATE POLICY "Public read category_availability"
  ON public.category_availability
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read product_availability"
  ON public.product_availability
  FOR SELECT
  TO public
  USING (true);

-- Only authenticated users (administrators) can INSERT, UPDATE, or DELETE
CREATE POLICY "Authenticated write category_availability"
  ON public.category_availability
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated write product_availability"
  ON public.product_availability
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Enable Realtime Replication
-- Allows public menu to update instantly when admin toggles availability
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'category_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.category_availability;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'product_availability'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_availability;
  END IF;
END $$;

-- 7. Seed Initial Category Availability (15 Categories)
INSERT INTO public.category_availability (category_id, is_available) VALUES
${categories.map(c => `  ('${c.id}', true)`).join(',\n')}
ON CONFLICT (category_id) DO NOTHING;

-- 8. Seed Initial Product Availability (173 Products)
INSERT INTO public.product_availability (product_id, category_id, is_available) VALUES
${allMenuItems.map(p => `  ('${p.id}', '${p.categoryId}', true)`).join(',\n')}
ON CONFLICT (product_id) DO NOTHING;
`;

if (!fs.existsSync('supabase')) {
  fs.mkdirSync('supabase');
}
fs.writeFileSync('supabase/schema.sql', sql, 'utf-8');
console.log('Successfully generated supabase/schema.sql with', categories.length, 'categories and', allMenuItems.length, 'products');
