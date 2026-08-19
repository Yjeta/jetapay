-- ============================================================================
-- Contrôle d'accès (RBAC) — JETA GROUPE · Suivi des Paiements
-- ============================================================================
-- Ajoute l'authentification obligatoire et la gestion des rôles :
--   • admin     : accès total (CRUD partout + gestion des utilisateurs)
--   • comptable : consultation + création/modification des données
--                 opérationnelles (paiements, factures, lettrage, fournisseurs,
--                 bénéficiaires, comptes bancaires) — PAS de suppression
--   • lecture   : consultation seule
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Table des profils utilisateurs (liée à auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profils (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  nom text,
  role text NOT NULL DEFAULT 'lecture' CHECK (role IN ('admin', 'comptable', 'lecture')),
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profils IS 'Profils utilisateurs avec rôle (admin / comptable / lecture)';

-- ---------------------------------------------------------------------------
-- 2. Trigger : création automatique du profil à l'inscription d'un utilisateur
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profils (id, email, nom, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'nom', new.email),
    'lecture'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3. Fonctions d'aide au rôle (SECURITY DEFINER pour éviter la récursion RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profils WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_role() IN ('admin', 'comptable');
$$;

-- ---------------------------------------------------------------------------
-- 4. RLS sur la table des profils
--    • SELECT : l'utilisateur sur son propre profil + l'admin sur tout
--    • INSERT/UPDATE/DELETE : admin uniquement
-- ---------------------------------------------------------------------------
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profils_select" ON public.profils;
CREATE POLICY "profils_select" ON public.profils
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.current_role() = 'admin');

DROP POLICY IF EXISTS "profils_insert" ON public.profils;
CREATE POLICY "profils_insert" ON public.profils
  FOR INSERT TO authenticated
  WITH CHECK (public.current_role() = 'admin');

DROP POLICY IF EXISTS "profils_update" ON public.profils;
CREATE POLICY "profils_update" ON public.profils
  FOR UPDATE TO authenticated
  USING (public.current_role() = 'admin')
  WITH CHECK (public.current_role() = 'admin');

DROP POLICY IF EXISTS "profils_delete" ON public.profils;
CREATE POLICY "profils_delete" ON public.profils
  FOR DELETE TO authenticated
  USING (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- 5. Réécriture des politiques RLS de toutes les tables de données
--    • Toutes les anciennes policies "anon_*" sont supprimées (plus d'accès
--      anonyme) : SELECT réservé aux utilisateurs authentifiés.
--    • Tables opérationnelles  → INSERT/UPDATE : admin OU comptable
--    • Tables de référence     → INSERT/UPDATE : admin uniquement
--    • DELETE                  → admin uniquement (toutes les tables)
--    • Les politiques ne sont appliquées que sur les tables existantes
--      (la table beneficiaires n'est créée par aucune migration).
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  tbl text;
  legacy_base text;
BEGIN
  -- Suppression de toutes les anciennes policies "anon_*" (accès anonyme),
  -- quelle que soit leur dénomination (anon_select_*, anon_all_*, etc.).
  -- Tables opérationnelles
  FOR tbl, legacy_base IN SELECT * FROM (VALUES
    ('fournisseurs',      'fournisseurs'),
    ('comptes_bancaires', 'comptes'),
    ('paiements',         'paiements'),
    ('factures',          'factures'),
    ('paiement_factures', 'paiement_factures'),
    ('beneficiaires',     'beneficiaires')
  ) AS v(tbl, base) LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_select_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_insert_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_update_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_delete_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_all_' || legacy_base, tbl);
    END IF;
  END LOOP;

  -- Tables de référence (legacy anon_all_*)
  FOR tbl, legacy_base IN SELECT * FROM (VALUES
    ('filiales',           'filiales'),
    ('banques',            'banques'),
    ('zones_geographiques','zones'),
    ('localisations',      'localisations'),
    ('chantiers',          'chantiers')
  ) AS v(tbl, base) LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_select_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_insert_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_update_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_delete_' || legacy_base, tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'anon_all_' || legacy_base, tbl);
    END IF;
  END LOOP;

  -- Tables de référence : écriture admin uniquement
  FOREACH tbl IN ARRAY ARRAY[
    'filiales', 'banques', 'zones_geographiques', 'chantiers', 'localisations'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', tbl || '_select', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.current_role() = ''admin'')', tbl || '_insert', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.current_role() = ''admin'') WITH CHECK (public.current_role() = ''admin'')', tbl || '_update', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.current_role() = ''admin'')', tbl || '_delete', tbl);
    END IF;
  END LOOP;

  -- Tables opérationnelles : écriture admin OU comptable, DELETE admin uniquement
  FOREACH tbl IN ARRAY ARRAY[
    'fournisseurs', 'comptes_bancaires', 'paiements', 'factures',
    'paiement_factures', 'beneficiaires'
  ] LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_select', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', tbl || '_select', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_insert', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_write())', tbl || '_insert', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_update', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.can_write()) WITH CHECK (public.can_write())', tbl || '_update', tbl);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_delete', tbl);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.current_role() = ''admin'')', tbl || '_delete', tbl);
    END IF;
  END LOOP;
END $$;
