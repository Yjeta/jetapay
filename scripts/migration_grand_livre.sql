-- Migration: Grand Livre & Lettrage
ALTER TABLE factures ADD COLUMN IF NOT EXISTS lettre BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE factures ADD COLUMN IF NOT EXISTS date_lettrage TIMESTAMPTZ;

-- Ajout montant unitaire par liaison paiement-facture (lettrage partiel)
ALTER TABLE paiement_factures ADD COLUMN IF NOT EXISTS montant NUMERIC(15,2);
-- Initialisation : monte le montant de chaque lien avec le montant du paiement
UPDATE paiement_factures pf
SET montant = p.montant
FROM paiements p
WHERE p.id = pf.paiement_id AND pf.montant IS NULL;

-- Code de lettrage : identifiant unique partagé par toutes les liaisons d'une même opération
ALTER TABLE paiement_factures ADD COLUMN IF NOT EXISTS code_lettrage TEXT;
CREATE INDEX IF NOT EXISTS idx_paiement_factures_code_lettrage ON paiement_factures(code_lettrage);
