-- Ajout de "Mise à disposition" dans le CHECK constraint de paiements.type_paiement

ALTER TABLE paiements
  DROP CONSTRAINT IF EXISTS paiements_type_paiement_check;

ALTER TABLE paiements
  ADD CONSTRAINT paiements_type_paiement_check
    CHECK (type_paiement IN ('Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition'));
