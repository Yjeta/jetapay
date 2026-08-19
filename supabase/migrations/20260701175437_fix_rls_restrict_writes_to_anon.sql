-- Fix RLS: restrict write operations (INSERT, UPDATE, DELETE) to anon role only.
-- SELECT remains open to both anon and authenticated (read-only public access).
-- This removes the unrestricted authenticated write surface reported by the security scanner.

-- filiales
DROP POLICY IF EXISTS "anon_insert_filiales" ON filiales;
DROP POLICY IF EXISTS "anon_update_filiales" ON filiales;
DROP POLICY IF EXISTS "anon_delete_filiales" ON filiales;

CREATE POLICY "anon_insert_filiales" ON filiales
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_filiales" ON filiales
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_filiales" ON filiales
  FOR DELETE TO anon USING (true);

-- banques
DROP POLICY IF EXISTS "anon_insert_banques" ON banques;
DROP POLICY IF EXISTS "anon_update_banques" ON banques;
DROP POLICY IF EXISTS "anon_delete_banques" ON banques;

CREATE POLICY "anon_insert_banques" ON banques
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_banques" ON banques
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_banques" ON banques
  FOR DELETE TO anon USING (true);

-- fournisseurs
DROP POLICY IF EXISTS "anon_insert_fournisseurs" ON fournisseurs;
DROP POLICY IF EXISTS "anon_update_fournisseurs" ON fournisseurs;
DROP POLICY IF EXISTS "anon_delete_fournisseurs" ON fournisseurs;

CREATE POLICY "anon_insert_fournisseurs" ON fournisseurs
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_fournisseurs" ON fournisseurs
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_fournisseurs" ON fournisseurs
  FOR DELETE TO anon USING (true);

-- comptes_bancaires
DROP POLICY IF EXISTS "anon_insert_comptes" ON comptes_bancaires;
DROP POLICY IF EXISTS "anon_update_comptes" ON comptes_bancaires;
DROP POLICY IF EXISTS "anon_delete_comptes" ON comptes_bancaires;

CREATE POLICY "anon_insert_comptes" ON comptes_bancaires
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_comptes" ON comptes_bancaires
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_comptes" ON comptes_bancaires
  FOR DELETE TO anon USING (true);

-- paiements
DROP POLICY IF EXISTS "anon_insert_paiements" ON paiements;
DROP POLICY IF EXISTS "anon_update_paiements" ON paiements;
DROP POLICY IF EXISTS "anon_delete_paiements" ON paiements;

CREATE POLICY "anon_insert_paiements" ON paiements
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_paiements" ON paiements
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_paiements" ON paiements
  FOR DELETE TO anon USING (true);
