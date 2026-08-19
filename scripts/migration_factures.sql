-- Migration: Ajout du suivi des factures fournisseurs
-- À exécuter dans l'éditeur SQL Supabase

-- 1. Création de la table factures
CREATE TABLE IF NOT EXISTS factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_facture TEXT UNIQUE NOT NULL,
  fournisseur_id UUID NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
  date_facture DATE NOT NULL,
  date_echeance DATE NOT NULL,
  montant NUMERIC(15,2) NOT NULL CHECK (montant > 0),
  montant_paye NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant_paye >= 0),
  statut TEXT NOT NULL DEFAULT 'Impayée' CHECK (statut IN ('Impayée', 'Partiellement payée', 'Payée', 'Annulée')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Table de liaison paiement ↔ factures (N:N)
CREATE TABLE IF NOT EXISTS paiement_factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paiement_id UUID NOT NULL REFERENCES paiements(id) ON DELETE CASCADE,
  facture_id UUID NOT NULL REFERENCES factures(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(paiement_id, facture_id)
);

-- 3. Suppression de l'ancienne colonne facture_id dans paiements
ALTER TABLE paiements DROP COLUMN IF EXISTS facture_id;

-- 4. Ajout du champ filiale_id dans factures
ALTER TABLE factures ADD COLUMN IF NOT EXISTS filiale_id UUID REFERENCES filiales(id) ON DELETE SET NULL;

-- 5. Index
CREATE INDEX IF NOT EXISTS idx_factures_fournisseur ON factures(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_filiale ON factures(filiale_id);
CREATE INDEX IF NOT EXISTS idx_paiement_factures_paiement ON paiement_factures(paiement_id);
CREATE INDEX IF NOT EXISTS idx_paiement_factures_facture ON paiement_factures(facture_id);

-- 6. RLS — factures
ALTER TABLE factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_factures" ON factures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_factures" ON factures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_factures" ON factures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_factures" ON factures FOR DELETE TO anon, authenticated USING (true);

-- 6. RLS — paiement_factures
ALTER TABLE paiement_factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_select_paiement_factures" ON paiement_factures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_paiement_factures" ON paiement_factures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_paiement_factures" ON paiement_factures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_paiement_factures" ON paiement_factures FOR DELETE TO anon, authenticated USING (true);
