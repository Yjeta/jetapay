-- ============================================================================
-- Comptable : CRUD complet sur certains menus (JETA GROUPE · Suivi des Paiements)
-- ============================================================================
-- À exécuter APRÈS 20260806120000_add_auth_rbac.sql.
--
-- Le rôle « comptable » obtient :
--   • fournisseurs             → suppression autorisée (INSERT/UPDATE déjà OK)
--   • comptes_bancaires        → suppression autorisée (comptes des fournisseurs)
--   • zones_geographiques      → INSERT/UPDATE/DELETE (menu Provinces)
--   • localisations            → INSERT/UPDATE/DELETE
--   • chantiers                → INSERT/UPDATE/DELETE
--   • grand livre              → lettrage (UPDATE factures) déjà autorisé
--
-- Tables inchangées (suppression réservée à l'admin) :
--   paiements, factures, paiement_factures, beneficiaires, filiales, banques
-- ============================================================================

DO $$
DECLARE
  tbl text;
BEGIN
  -- --------------------------------------------------------------------------
  -- 1. fournisseurs : DELETE admin OU comptable
  -- --------------------------------------------------------------------------
  IF to_regclass('public.fournisseurs') IS NOT NULL THEN
    DROP POLICY IF EXISTS fournisseurs_delete ON public.fournisseurs;
    CREATE POLICY fournisseurs_delete ON public.fournisseurs
      FOR DELETE TO authenticated
      USING (public.current_role() IN ('admin', 'comptable'));
  END IF;

  -- --------------------------------------------------------------------------
  -- 2. comptes_bancaires : DELETE admin OU comptable (comptes des fournisseurs
  --    supprimés depuis la page Fournisseurs)
  -- --------------------------------------------------------------------------
  IF to_regclass('public.comptes_bancaires') IS NOT NULL THEN
    DROP POLICY IF EXISTS comptes_bancaires_delete ON public.comptes_bancaires;
    CREATE POLICY comptes_bancaires_delete ON public.comptes_bancaires
      FOR DELETE TO authenticated
      USING (public.current_role() IN ('admin', 'comptable'));
  END IF;

  -- --------------------------------------------------------------------------
  -- 3. Tables de référence gérées par le comptable : INSERT/UPDATE via
  --    can_write() (admin + comptable), DELETE admin OU comptable
  -- --------------------------------------------------------------------------
  FOREACH tbl IN ARRAY ARRAY[
    'zones_geographiques', 'localisations', 'chantiers'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write())', tbl || '_insert', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', tbl || '_update', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.current_role() IN (''admin'', ''comptable''))', tbl || '_delete', tbl);
    END IF;
  END LOOP;
END $$;
