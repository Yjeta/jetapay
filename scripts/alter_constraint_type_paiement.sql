ALTER TABLE public.paiements DROP CONSTRAINT IF EXISTS paiements_type_paiement_check;
ALTER TABLE public.paiements ADD CONSTRAINT paiements_type_paiement_check 
  CHECK (type_paiement = ANY (ARRAY['Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition', 'Opération bancaire']));
