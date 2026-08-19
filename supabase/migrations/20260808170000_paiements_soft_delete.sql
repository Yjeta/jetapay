-- Soft delete pour paiements : rester affiché mais barré, sans effet sur solde
ALTER TABLE paiements ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
