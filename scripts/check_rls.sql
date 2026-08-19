SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('factures', 'paiement_factures');
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename IN ('factures', 'paiement_factures') ORDER BY tablename, policyname;
