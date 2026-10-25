-- ====================================================================
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
  ('patisserie', true),
  ('viennoiserie', true),
  ('boissons-chaudes', true),
  ('ice-latte', true),
  ('brunch', true),
  ('les-salees', true),
  ('salades', true),
  ('pancakes', true),
  ('crepes', true),
  ('glaces', true),
  ('gateaux-voyage', true),
  ('mojitos', true),
  ('smoothies', true),
  ('cocktails', true),
  ('jus-presses', true)
ON CONFLICT (category_id) DO NOTHING;

-- 8. Seed Initial Product Availability (173 Products)
INSERT INTO public.product_availability (product_id, category_id, is_available) VALUES
  ('cesar-broasted', 'salades', true),
  ('chevre-chaud', 'salades', true),
  ('delice-camembert-700', 'salades', true),
  ('delice-camembert-burrata', 'salades', true),
  ('salade-nicoise', 'salades', true),
  ('brunch-anglais', 'brunch', true),
  ('brunch-lwlaida-item', 'brunch', true),
  ('brunch-le-parisien', 'brunch', true),
  ('brunch-new-yorkais', 'brunch', true),
  ('brunch-ojja', 'brunch', true),
  ('bastilla-poulet-amande', 'les-salees', true),
  ('batbout-poulet', 'les-salees', true),
  ('brochetta-saumon-avocat', 'les-salees', true),
  ('brochetta-champignons', 'les-salees', true),
  ('brochetta-tomate-basilic', 'les-salees', true),
  ('brochetta-chevre-miel', 'les-salees', true),
  ('club-sandwich', 'les-salees', true),
  ('croc-monsieur', 'les-salees', true),
  ('fougasse-poulet', 'les-salees', true),
  ('fougasse-saumon', 'les-salees', true),
  ('fougasse-thon', 'les-salees', true),
  ('fougasse-viande', 'les-salees', true),
  ('mini-burger-crispe', 'les-salees', true),
  ('mini-burger-viande', 'les-salees', true),
  ('mini-pizza', 'les-salees', true),
  ('panini-poulet', 'les-salees', true),
  ('panini-quatre-fromage', 'les-salees', true),
  ('panini-viande', 'les-salees', true),
  ('quiche', 'les-salees', true),
  ('quiche-poulet', 'les-salees', true),
  ('quiche-saumon-epinard', 'les-salees', true),
  ('quiche-thon', 'les-salees', true),
  ('cafe-au-lait', 'boissons-chaudes', true),
  ('cafe-bombon', 'boissons-chaudes', true),
  ('cafe-mocha', 'boissons-chaudes', true),
  ('cafe-espresso', 'boissons-chaudes', true),
  ('cappuccino', 'boissons-chaudes', true),
  ('chocolat-chaud', 'boissons-chaudes', true),
  ('doppie-espresso', 'boissons-chaudes', true),
  ('kahwat-dar-3', 'boissons-chaudes', true),
  ('kahwat-dar-4', 'boissons-chaudes', true),
  ('macchiato-saveurs', 'boissons-chaudes', true),
  ('macchiato-espresso', 'boissons-chaudes', true),
  ('petite-theiere', 'boissons-chaudes', true),
  ('the-gourmand', 'boissons-chaudes', true),
  ('the-infusions', 'boissons-chaudes', true),
  ('the-maison', 'boissons-chaudes', true),
  ('cafe-affogato', 'ice-latte', true),
  ('ice-americano', 'ice-latte', true),
  ('ice-caramel', 'ice-latte', true),
  ('ice-latte-pistache', 'ice-latte', true),
  ('ice-mocha', 'ice-latte', true),
  ('ice-spanish-latte', 'ice-latte', true),
  ('baghrir', 'viennoiserie', true),
  ('brioche-au-chocolat', 'viennoiserie', true),
  ('brioche-chocolat', 'viennoiserie', true),
  ('brioche-nature', 'viennoiserie', true),
  ('chausson-citron', 'viennoiserie', true),
  ('chausson-pomme', 'viennoiserie', true),
  ('croissant', 'viennoiserie', true),
  ('croissant-amande', 'viennoiserie', true),
  ('lbraje', 'viennoiserie', true),
  ('mini-palmier', 'viennoiserie', true),
  ('msamen', 'viennoiserie', true),
  ('pain-chocolat', 'viennoiserie', true),
  ('pain-raisin', 'viennoiserie', true),
  ('suisse', 'viennoiserie', true),
  ('viennois-nature', 'viennoiserie', true),
  ('pancake-banane', 'pancakes', true),
  ('pancake-chocolat', 'pancakes', true),
  ('pancake-classique', 'pancakes', true),
  ('pancake-fruits', 'pancakes', true),
  ('supp-glace', 'pancakes', true),
  ('supp-chocolat', 'pancakes', true),
  ('crepe-banane', 'crepes', true),
  ('crepe-chocolat', 'crepes', true),
  ('crepe-fruits', 'crepes', true),
  ('glace-1-boule', 'glaces', true),
  ('glace-2-boules', 'glaces', true),
  ('banana-split', 'glaces', true),
  ('mojito-black', 'mojitos', true),
  ('mojito-bresilien', 'mojitos', true),
  ('mojito-classique', 'mojitos', true),
  ('mojito-fraise', 'mojitos', true),
  ('mojito-golden', 'mojitos', true),
  ('shake-4-choco', 'smoothies', true),
  ('shake-banane', 'smoothies', true),
  ('shake-choco-banane', 'smoothies', true),
  ('shake-fraise', 'smoothies', true),
  ('shake-healthy', 'smoothies', true),
  ('shake-pistachio', 'smoothies', true),
  ('smoothie-banana', 'smoothies', true),
  ('smoothie-chocolato', 'smoothies', true),
  ('smoothie-fraise', 'smoothies', true),
  ('smoothie-lwalida', 'smoothies', true),
  ('smoothie-tropical', 'smoothies', true),
  ('cocktail-bleu-hawaienne', 'cocktails', true),
  ('cocktails-de-fruits', 'cocktails', true),
  ('cocktail-coconut-banana', 'cocktails', true),
  ('cocktail-pina-colada', 'cocktails', true),
  ('cocktail-pink-lady', 'cocktails', true),
  ('cocktail-very-berry', 'cocktails', true),
  ('boisson-canette', 'jus-presses', true),
  ('eau-gaziere', 'jus-presses', true),
  ('eau-plate', 'jus-presses', true),
  ('jus-orange', 'jus-presses', true),
  ('jus-banane', 'jus-presses', true),
  ('jus-citron', 'jus-presses', true),
  ('jus-fraise', 'jus-presses', true),
  ('jus-kiwi', 'jus-presses', true),
  ('jus-mangue', 'jus-presses', true),
  ('brownie-chocolat', 'patisserie', true),
  ('trompe-loeil-amande', 'patisserie', true),
  ('cheese-cake', 'patisserie', true),
  ('figues', 'patisserie', true),
  ('cheese-cake-mangue', 'patisserie', true),
  ('fraisier', 'patisserie', true),
  ('cheese-cake-pistache', 'patisserie', true),
  ('cookies-pistache', 'patisserie', true),
  ('eclaire-bueno', 'patisserie', true),
  ('eclaire-cafe', 'patisserie', true),
  ('eclaire-chocolat', 'patisserie', true),
  ('eclaire-tiramisu', 'patisserie', true),
  ('eclaire-vanille', 'patisserie', true),
  ('tarte-chocolat', 'patisserie', true),
  ('tarte-citron-meringuee', 'patisserie', true),
  ('tarte-fraise-item', 'patisserie', true),
  ('tarte-framboise', 'patisserie', true),
  ('snickers', 'patisserie', true),
  ('flan-patissier', 'patisserie', true),
  ('plan-patissier-chocolat', 'patisserie', true),
  ('tarte-citron', 'patisserie', true),
  ('herisson', 'patisserie', true),
  ('tarte-concasseei', 'patisserie', true),
  ('mbeses', 'patisserie', true),
  ('mille-feuille-item', 'patisserie', true),
  ('mini-cake-citron', 'patisserie', true),
  ('muffin-chocolat', 'patisserie', true),
  ('muffin-vanille-fruit-rouge', 'patisserie', true),
  ('opera', 'patisserie', true),
  ('100-chocolat', 'patisserie', true),
  ('orientale', 'patisserie', true),
  ('paris-brest', 'patisserie', true),
  ('paris-brest-pistache-item', 'patisserie', true),
  ('royal', 'patisserie', true),
  ('charlotte-fruit', 'patisserie', true),
  ('saint-honore', 'patisserie', true),
  ('samsa', 'patisserie', true),
  ('san-sebastian-cheesecake', 'patisserie', true),
  ('succes', 'patisserie', true),
  ('foret-noir', 'patisserie', true),
  ('tarte-tintin', 'patisserie', true),
  ('tarte-pistache', 'patisserie', true),
  ('tarte-pomme', 'patisserie', true),
  ('trompe-loeil-cacahuete', 'patisserie', true),
  ('trompe-loeil-framboise', 'patisserie', true),
  ('trompe-loeil-citron', 'patisserie', true),
  ('trompe-loeil-noisette', 'patisserie', true),
  ('fruit-de-la-passion', 'patisserie', true),
  ('les-trompes-loeil', 'patisserie', true),
  ('brownie-chocolat', 'gateaux-voyage', true),
  ('brownie-pistache', 'gateaux-voyage', true),
  ('cake-citron', 'gateaux-voyage', true),
  ('cake-marbre', 'gateaux-voyage', true),
  ('cookies', 'gateaux-voyage', true),
  ('fondant-chocolat', 'gateaux-voyage', true),
  ('madeleine-chocolat', 'gateaux-voyage', true),
  ('madeleine-vanille', 'gateaux-voyage', true),
  ('muffins-chocolat', 'gateaux-voyage', true),
  ('muffins-vanille', 'gateaux-voyage', true),
  ('petit-cake-citron', 'gateaux-voyage', true),
  ('petit-cake-marbre', 'gateaux-voyage', true),
  ('torno', 'gateaux-voyage', true)
ON CONFLICT (product_id) DO NOTHING;
