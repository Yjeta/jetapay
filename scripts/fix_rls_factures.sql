-- Factures policies
DROP POLICY IF EXISTS "anon_select_factures" ON factures;
DROP POLICY IF EXISTS "anon_insert_factures" ON factures;
DROP POLICY IF EXISTS "anon_update_factures" ON factures;
DROP POLICY IF EXISTS "anon_delete_factures" ON factures;

CREATE POLICY "anon_select_factures" ON factures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_factures" ON factures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_factures" ON factures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_factures" ON factures FOR DELETE TO anon, authenticated USING (true);

-- Paiement_factures policies
DROP POLICY IF EXISTS "anon_select_paiement_factures" ON paiement_factures;
DROP POLICY IF EXISTS "anon_insert_paiement_factures" ON paiement_factures;
DROP POLICY IF EXISTS "anon_update_paiement_factures" ON paiement_factures;
DROP POLICY IF EXISTS "anon_delete_paiement_factures" ON paiement_factures;

CREATE POLICY "anon_select_paiement_factures" ON paiement_factures FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_paiement_factures" ON paiement_factures FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_paiement_factures" ON paiement_factures FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_paiement_factures" ON paiement_factures FOR DELETE TO anon, authenticated USING (true);
