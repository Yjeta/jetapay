-- Ajout du support des paiements inter-filiales

ALTER TABLE paiements
  ADD COLUMN IF NOT EXISTS filiale_receptrice_id uuid REFERENCES filiales(id) ON DELETE CASCADE,
  ALTER COLUMN fournisseur_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_paiements_filiale_receptrice ON paiements(filiale_receptrice_id);
