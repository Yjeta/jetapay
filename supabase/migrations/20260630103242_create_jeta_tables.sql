/*
# Création des tables pour l'application JETA GROUPE - Suivi des Paiements

Cette migration crée l'ensemble du schéma de données pour le suivi des paiements du holding JETA GROUPE.

## 1. Nouvelles Tables

### `filiales`
- Représente les 4 filiales du groupe : AFS, Bloom Énergie, JETA Engineering, LRC
- `id` (uuid, clé primaire)
- `nom` (text, obligatoire) - nom de la filiale
- `code` (text, obligatoire) - code identifiant (AFS, BLOOM, JETA, LRC)
- `description` (text) - description optionnelle
- `created_at` (timestamptz) - date de création

### `banques`
- Banques disponibles dans le système
- `id` (uuid, clé primaire)
- `nom` (text, obligatoire) - nom de la banque
- `code` (text, obligatoire) - code identifiant (AFG, BGFI, ORABANK, ECOBANK)
- `created_at` (timestamptz)

### `comptes_bancaires`
- Comptes bancaires associés aux filiales et fournisseurs
- `id` (uuid, clé primaire)
- `entite_type` (text, obligatoire) - 'filiale' ou 'fournisseur'
- `entite_id` (uuid, obligatoire) - ID de la filiale ou du fournisseur
- `banque_id` (uuid, obligatoire) - référence vers la banque
- `numero_compte` (text, obligatoire) - numéro de compte
- `intitule` (text) - intitulé du compte
- `created_at` (timestamptz)

### `fournisseurs`
- Base de fournisseurs (CRISTAL GABON, AGENCE GABONAISSE, etc.)
- `id` (uuid, clé primaire)
- `nom` (text, obligatoire) - nom du fournisseur
- `domaine_activite` (text) - domaine d'activité
- `contact` (text) - informations de contact
- `telephone` (text) - téléphone
- `email` (text) - email
- `adresse` (text) - adresse
- `created_at` (timestamptz)

### `paiements`
- Registre de tous les paiements effectués
- `id` (uuid, clé primaire)
- `date_paiement` (date, obligatoire) - date du paiement
- `filiale_id` (uuid, obligatoire) - filiale effectuant le paiement
- `fournisseur_id` (uuid, obligatoire) - fournisseur bénéficiaire
- `montant` (numeric, obligatoire) - montant en XAF
- `type_paiement` (text, obligatoire) - 'Cash', 'Chèque', 'Virement', 'Traite'
- `reference` (text) - numéro de chèque, numéro de virement, etc.
- `compte_bancaire_id` (uuid, nullable) - compte bancaire utilisé (pour banque)
- `notes` (text) - observations
- `statut` (text, default 'Validé') - statut du paiement
- `created_at` (timestamptz)

## 2. Sécurité
- RLS activé sur toutes les tables
- Policies `TO anon, authenticated` pour permettre l'accès sans authentification (application single-tenant)

## 3. Notes
- Application single-tenant : pas d'authentification requise
- Les données sont partagées pour tous les utilisateurs du système
- Les clés étrangères garantissent l'intégrité référentielle
*/

CREATE TABLE IF NOT EXISTS filiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS banques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fournisseurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  domaine_activite text,
  contact text,
  telephone text,
  email text,
  adresse text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comptes_bancaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entite_type text NOT NULL CHECK (entite_type IN ('filiale', 'fournisseur')),
  entite_id uuid NOT NULL,
  banque_id uuid NOT NULL REFERENCES banques(id) ON DELETE CASCADE,
  numero_compte text NOT NULL,
  intitule text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_paiement date NOT NULL,
  filiale_id uuid NOT NULL REFERENCES filiales(id) ON DELETE CASCADE,
  fournisseur_id uuid NOT NULL REFERENCES fournisseurs(id) ON DELETE CASCADE,
  montant numeric(15,2) NOT NULL,
  type_paiement text NOT NULL CHECK (type_paiement IN ('Cash', 'Chèque', 'Virement', 'Traite')),
  reference text,
  compte_bancaire_id uuid REFERENCES comptes_bancaires(id) ON DELETE SET NULL,
  notes text,
  statut text NOT NULL DEFAULT 'Validé',
  created_at timestamptz DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_paiements_date ON paiements(date_paiement DESC);
CREATE INDEX IF NOT EXISTS idx_paiements_filiale ON paiements(filiale_id);
CREATE INDEX IF NOT EXISTS idx_paiements_fournisseur ON paiements(fournisseur_id);
CREATE INDEX IF NOT EXISTS idx_paiements_type ON paiements(type_paiement);
CREATE INDEX IF NOT EXISTS idx_comptes_entite ON comptes_bancaires(entite_type, entite_id);

-- RLS Policies

ALTER TABLE filiales ENABLE ROW LEVEL SECURITY;
ALTER TABLE banques ENABLE ROW LEVEL SECURITY;
ALTER TABLE fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE comptes_bancaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- Filiales policies
DROP POLICY IF EXISTS "anon_select_filiales" ON filiales;
CREATE POLICY "anon_select_filiales" ON filiales FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_filiales" ON filiales;
CREATE POLICY "anon_insert_filiales" ON filiales FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_filiales" ON filiales;
CREATE POLICY "anon_update_filiales" ON filiales FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_filiales" ON filiales;
CREATE POLICY "anon_delete_filiales" ON filiales FOR DELETE TO anon, authenticated USING (true);

-- Banques policies
DROP POLICY IF EXISTS "anon_select_banques" ON banques;
CREATE POLICY "anon_select_banques" ON banques FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_banques" ON banques;
CREATE POLICY "anon_insert_banques" ON banques FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_banques" ON banques;
CREATE POLICY "anon_update_banques" ON banques FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_banques" ON banques;
CREATE POLICY "anon_delete_banques" ON banques FOR DELETE TO anon, authenticated USING (true);

-- Fournisseurs policies
DROP POLICY IF EXISTS "anon_select_fournisseurs" ON fournisseurs;
CREATE POLICY "anon_select_fournisseurs" ON fournisseurs FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_fournisseurs" ON fournisseurs;
CREATE POLICY "anon_insert_fournisseurs" ON fournisseurs FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_fournisseurs" ON fournisseurs;
CREATE POLICY "anon_update_fournisseurs" ON fournisseurs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_fournisseurs" ON fournisseurs;
CREATE POLICY "anon_delete_fournisseurs" ON fournisseurs FOR DELETE TO anon, authenticated USING (true);

-- Comptes bancaires policies
DROP POLICY IF EXISTS "anon_select_comptes" ON comptes_bancaires;
CREATE POLICY "anon_select_comptes" ON comptes_bancaires FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_comptes" ON comptes_bancaires;
CREATE POLICY "anon_insert_comptes" ON comptes_bancaires FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_comptes" ON comptes_bancaires;
CREATE POLICY "anon_update_comptes" ON comptes_bancaires FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_comptes" ON comptes_bancaires;
CREATE POLICY "anon_delete_comptes" ON comptes_bancaires FOR DELETE TO anon, authenticated USING (true);

-- Paiements policies
DROP POLICY IF EXISTS "anon_select_paiements" ON paiements;
CREATE POLICY "anon_select_paiements" ON paiements FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_paiements" ON paiements;
CREATE POLICY "anon_insert_paiements" ON paiements FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_paiements" ON paiements;
CREATE POLICY "anon_update_paiements" ON paiements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_paiements" ON paiements;
CREATE POLICY "anon_delete_paiements" ON paiements FOR DELETE TO anon, authenticated USING (true);

-- Insérer les banques par défaut
INSERT INTO banques (nom, code) VALUES
  ('BGFI', 'BGFI'),
  ('Orabank', 'ORABANK'),
  ('Ecobank', 'ECOBANK'),
  ('AFG', 'AFG')
ON CONFLICT (code) DO NOTHING;

-- Insérer les filiales par défaut
INSERT INTO filiales (nom, code, description) VALUES
  ('AFS', 'AFS', 'Filiale AFS du groupe JETA'),
  ('Bloom Énergie', 'BLOOM', 'Filiale Bloom Énergie du groupe JETA'),
  ('JETA Engineering', 'JENG', 'Filiale JETA Engineering du groupe JETA'),
  ('LRC', 'LRC', 'Filiale LRC du groupe JETA')
ON CONFLICT (code) DO NOTHING;
