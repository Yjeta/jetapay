// Import des factures depuis le fichier gabarit Excel
// Usage: npx tsx scripts/import_factures_gabarit.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');
const getEnv = (key) => { const m = envRaw.split('\n').find(l => l.startsWith(key + '=')); if (!m) throw new Error(`Missing ${key}`); return m.split('=').slice(1).join('=').trim(); };

const sup = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const FICHIER = 'D:\\gabarit_import_factures.xlsx';

// Convert Excel serial date to YYYY-MM-DD
function serialToDate(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') return serial;
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

// Generate a simple code facture
async function generateCode() {
  const today = new Date();
  const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, '');
  const { count } = await sup
    .from('factures')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString().slice(0, 10) + 'T00:00:00Z');
  const seq = ((count || 0) + 1).toString().padStart(4, '0');
  return `FAC-${yyyymmdd}-${seq}`;
}

async function main() {
  const wb = XLSX.readFile(FICHIER);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const headers = rows[0];
  console.log('Headers:', headers);

  // Cache pour fournisseurs, filiales, chantiers
  const frsCache = {};
  const filialeCache = {};
  const chantierCache = {};

  let success = 0;
  let errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const code_facture = r[0];
    const fournisseurNom = r[1] ? String(r[1]).trim() : null;
    const filialeCode = r[2] ? String(r[2]).trim() : null;
    const chantierNom = r[3] ? String(r[3]).trim() : null;
    const dateFacture = serialToDate(r[4]);
    const dateEcheance = serialToDate(r[5]);
    const montant = r[6] ? Number(r[6]) : 0;
    const montantHt = r[7] ? Number(r[7]) : 0;
    const tva = r[8] ? Number(r[8]) : 0;
    const taxes1 = r[9] ? Number(r[9]) : 0;
    const taxes2 = r[10] ? Number(r[10]) : 0;
    const reference = r[11] ? String(r[11]).trim() : null;
    const notes = r[12] ? String(r[12]).trim() : null;

    if (!fournisseurNom || !montant) continue;

    // Résoudre fournisseur
    if (!frsCache[fournisseurNom]) {
      const key = fournisseurNom.toLowerCase();
      const { data } = await sup.from('fournisseurs').select('id').ilike('nom', key);
      if (!data || data.length === 0) {
        // Créer le fournisseur
        const { data: newFrs, error: crErr } = await sup.from('fournisseurs').insert({ nom: fournisseurNom }).select('id').single();
        if (crErr || !newFrs) {
          console.error(`✗ Fournisseur "${fournisseurNom}" introuvable et création échouée: ${crErr?.message}`);
          errors++;
          continue;
        }
        frsCache[fournisseurNom] = newFrs.id;
        console.log(`  + Fournisseur créé: ${fournisseurNom}`);
      } else {
        frsCache[fournisseurNom] = data[0].id;
      }
    }
    const fournisseurId = frsCache[fournisseurNom];

    // Résoudre filiale
    let filialeId = null;
    if (filialeCode) {
      if (!filialeCache[filialeCode]) {
        const { data } = await sup.from('filiales').select('id').ilike('code', filialeCode);
        if (data && data.length > 0) filialeCache[filialeCode] = data[0].id;
      }
      filialeId = filialeCache[filialeCode] || null;
    }

    // Résoudre chantier
    let chantierId = null;
    if (chantierNom) {
      if (!chantierCache[chantierNom]) {
        const { data } = await sup.from('chantiers').select('id').ilike('nom', chantierNom);
        if (data && data.length > 0) chantierCache[chantierNom] = data[0].id;
      }
      chantierId = chantierCache[chantierNom] || null;
    }

    const totalTaxes = taxes1 + taxes2;

    const insertData = {
      fournisseur_id: fournisseurId,
      filiale_id: filialeId,
      chantier_id: chantierId,
      date_facture: dateFacture,
      date_echeance: dateEcheance || dateFacture,
      montant: montant,
      montant_ht: montantHt || (montant - tva - totalTaxes),
      tva: tva || 0,
      taxes: totalTaxes || 0,
      reference: reference,
      notes: notes,
      statut: 'Impayée',
    };

    if (code_facture) {
      insertData.code_facture = String(code_facture).trim();
    } else {
      insertData.code_facture = await generateCode();
    }

    const { error } = await sup.from('factures').insert(insertData);

    if (error) {
      console.error(`✗ ${fournisseurNom} — ${montant.toLocaleString()} FCFA: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${insertData.code_facture} — ${fournisseurNom} — ${montant.toLocaleString()} FCFA`);
      success++;
    }
  }

  console.log(`\nTerminé : ${success} succès, ${errors} erreurs`);
}

main().catch(console.error);
