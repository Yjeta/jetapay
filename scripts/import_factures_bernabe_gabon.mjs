// Import des factures BERNABE GABON SA depuis Grand_livre_clients_LQ0007.xlsx
// Usage: node --env-file .env scripts/import_factures_bernabe_gabon.mjs

import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const sup = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const FICHIER = 'C:\\Users\\a.yaakoubi\\Downloads\\Grand_livre_clients_LQ0007.xlsx';
const NOM_FOURNISSEUR = 'BERNABE GABON SA';
const CODE_FILIALE = 'LRC';

function parseDate(ddmmyy) {
  const [d, m, y] = ddmmyy.split('/');
  return `20${y}-${m}-${d}`;
}

async function main() {
  const { data: fournisseurs } = await sup.from('fournisseurs').select('id').ilike('nom', NOM_FOURNISSEUR);
  if (!fournisseurs?.length) { console.error('Fournisseur introuvable'); return; }
  const fournisseurId = fournisseurs[0].id;

  const { data: filiales } = await sup.from('filiales').select('id').eq('code', CODE_FILIALE);
  if (!filiales?.length) { console.error('Filiale introuvable'); return; }
  const filialeId = filiales[0].id;

  const wb = XLSX.readFile(FICHIER);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let success = 0, errors = 0;
  for (let i = 1; i < rows.length; i++) {
    const [date, code, desc, ttc, ht, tva, css] = rows[i];
    if (!code || !ttc || ttc <= 0) continue;

    const { error } = await sup.from('factures').insert({
      code_facture: String(code),
      fournisseur_id: fournisseurId,
      filiale_id: filialeId,
      date_facture: parseDate(String(date)),
      date_echeance: parseDate(String(date)),
      montant: ttc,
      montant_ht: ht || 0,
      tva: tva || 0,
      taxes: css || 0,
      statut: 'Impayée',
    });

    if (error) {
      console.error(`✗ ${code}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${code} — ${(ttc / 1000000).toFixed(0)}M FCFA`);
      success++;
    }
  }

  console.log(`\nTerminé : ${success} succès, ${errors} erreurs`);
}

main();
