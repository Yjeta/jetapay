-- Migration: Zones géographiques, Localisations & Chantiers
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Zones géographiques (Provinces)
CREATE TABLE IF NOT EXISTS zones_geographiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Localisations (villes / zones, rattachées à une province)
CREATE TABLE IF NOT EXISTS localisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  zone_id UUID NOT NULL REFERENCES zones_geographiques(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(nom, zone_id)
);

-- 3. Chantiers (projets, rattachés à une localisation)
CREATE TABLE IF NOT EXISTS chantiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  localisation_id UUID REFERENCES localisations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Factures : supprimer zone_id (province dérivée via chantier → localisation)
ALTER TABLE factures DROP COLUMN IF EXISTS zone_id;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS chantier_id UUID REFERENCES chantiers(id) ON DELETE SET NULL;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_localisations_zone ON localisations(zone_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_localisation ON chantiers(localisation_id);
CREATE INDEX IF NOT EXISTS idx_factures_chantier ON factures(chantier_id);

-- 6. RLS
ALTER TABLE zones_geographiques ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_zones" ON zones_geographiques;
CREATE POLICY "anon_all_zones" ON zones_geographiques FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE localisations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_localisations" ON localisations;
CREATE POLICY "anon_all_localisations" ON localisations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_chantiers" ON chantiers;
CREATE POLICY "anon_all_chantiers" ON chantiers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
