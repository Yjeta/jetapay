-- ============================================================================
-- Rôle « assistant » + workflow de validation (JETA GROUPE · Suivi des Paiements)
-- ============================================================================
-- À exécuter APRÈS 20260806120000_add_auth_rbac.sql,
--              20260807120000_comptable_crud.sql,
--              20260807140000_add_profil_permissions.sql.
--
-- 1. Nouveau rôle « assistant » : même accès que le comptable (CRUD sur
--    fournisseurs, provinces, localisations, chantiers + saisie des paiements,
--    factures, bénéficiaires) mais SANS suppression, et ses écritures sont
--    marquées « en_attente » jusqu'à validation par le comptable ou l'admin.
-- 2. Colonnes de validation sur 6 tables :
--      validation_status  text  ('valide' | 'en_attente')
--      auteur_id          uuid  (auteur de la dernière écriture)
--      valide_par         uuid  (validateur)
--      date_validation    timestamptz
-- 3. Trigger : toute écriture d'un « assistant » → en_attente ; toute écriture
--    d'un comptable/admin → valide (modifier une ligne en attente = la valider).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Rôle « assistant » : contrainte profils + fonction can_write()
-- ---------------------------------------------------------------------------
ALTER TABLE public.profils DROP CONSTRAINT IF EXISTS profils_role_check;
ALTER TABLE public.profils ADD CONSTRAINT profils_role_check
  CHECK (role IN ('admin', 'comptable', 'assistant', 'lecture'));

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_role() IN ('admin', 'comptable', 'assistant');
$$;

-- ---------------------------------------------------------------------------
-- 2. Colonnes de validation + triggers sur les tables concernées
--    (les politiques INSERT/UPDATE de ces tables utilisent can_write(), ce qui
--    couvre désormais l'assistant ; les DELETE restent réservés admin/comptable,
--    donc l'assistant ne peut pas supprimer : pas de statut « suppression ».)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_validation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.auteur_id := auth.uid();
    NEW.valide_par := NULL;
    NEW.date_validation := NULL;
    IF public.current_role() = 'assistant' THEN
      NEW.validation_status := 'en_attente';
    ELSE
      NEW.validation_status := 'valide';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.auteur_id := auth.uid();
    IF public.current_role() = 'assistant' THEN
      NEW.validation_status := 'en_attente';
      NEW.valide_par := NULL;
      NEW.date_validation := NULL;
    ELSE
      NEW.validation_status := 'valide';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'paiements', 'factures', 'fournisseurs',
    'zones_geographiques', 'localisations', 'chantiers'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT ''valide''', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS auteur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS valide_par uuid REFERENCES auth.users(id) ON DELETE SET NULL', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS date_validation timestamptz', tbl);
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', tbl, tbl || '_validation_status_check');
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (validation_status IN (''valide'',''en_attente''))', tbl, tbl || '_validation_status_check');
      EXECUTE format('DROP TRIGGER IF EXISTS trg_validation_status ON public.%I', tbl);
      EXECUTE format('CREATE TRIGGER trg_validation_status BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_validation_status()', tbl);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Le compte « Assistant Comptable » passe sur le rôle assistant
-- ---------------------------------------------------------------------------
UPDATE public.profils
SET role = 'assistant', permissions = NULL
WHERE email = 'assistant.comptable@jetagroupe.com';
