-- Ajout d'un identifiant unique parlant pour les paiements

ALTER TABLE paiements
  ADD COLUMN IF NOT EXISTS code_paiement text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_paiements_code ON paiements(code_paiement);

-- Générer les codes pour les paiements existants (si un update les rattrape)
UPDATE paiements SET code_paiement = 'PAY-' || (
  SELECT code FROM filiales WHERE id = paiements.filiale_id
) || '-' || to_char(date_paiement, 'YYYYMMDD') || '-' || lpad(row_number() OVER (PARTITION BY filiale_id, date_paiement ORDER BY created_at)::text, 4, '0')
WHERE code_paiement IS NULL;

ALTER TABLE paiements
  ALTER COLUMN code_paiement SET NOT NULL;
