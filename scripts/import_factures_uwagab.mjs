// Import des factures UWAGAB pour la filiale LRC
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');
const getEnv = (key) => { const m = envRaw.split('\n').find(l => l.startsWith(key + '=')); if (!m) throw new Error(`Missing ${key}`); return m.split('=').slice(1).join('=').trim(); };

const sup = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const FILIALE_ID = '6b8ab416-a5de-41c5-97cd-76b2974a3a4b'; // LRC - LE ROI DES CHANTIERS

// Créer ou récupérer le fournisseur UWAGAB
async function getUwagabId() {
  const { data } = await sup.from('fournisseurs').select('id').ilike('nom', 'uwagab');
  if (data && data.length > 0) return data[0].id;
  const { data: created, error } = await sup.from('fournisseurs').insert({ nom: 'UWAGAB' }).select('id').single();
  if (error) throw new Error(`Création UWAGAB échouée: ${error.message}`);
  console.log('+ Fournisseur UWAGAB créé');
  return created.id;
}

const factures = [
  { code_facture: '620/UV/2025', date_facture: '2025-10-14', montant: 18000000, notes: 'Bordure T2 (2000 x 9000)' },
  { code_facture: '621/UW/2025', date_facture: '2025-10-22', montant: 4928000, notes: 'Pavé de 13cm (224 x 22000)' },
  { code_facture: '623/UW/2025', date_facture: '2025-10-22', montant: 28000000, notes: 'Caniveau 50x50 (350 x 80000)' },
  { code_facture: '651/UW/2025', date_facture: '2025-10-27', montant: 33000000, notes: 'Bordure T3 (1500 x 13000) + Bordure C52 (1500 x 9000)' },
];

async function main() {
  const fournisseurId = await getUwagabId();

  let success = 0;
  let errors = 0;

  for (const f of factures) {
    const { data: exists } = await sup.from('factures').select('id').eq('code_facture', f.code_facture).eq('fournisseur_id', fournisseurId);
    if (exists && exists.length > 0) {
      console.log(`- ${f.code_facture} déjà présente, ignorée`);
      continue;
    }

    const { error } = await sup.from('factures').insert({
      code_facture: f.code_facture,
      fournisseur_id: fournisseurId,
      filiale_id: FILIALE_ID,
      date_facture: f.date_facture,
      date_echeance: f.date_facture,
      montant: f.montant,
      montant_ht: f.montant,
      tva: 0,
      taxes: 0,
      montant_paye: 0,
      statut: 'Impayée',
      lettre: false,
      notes: f.notes,
    });

    if (error) {
      console.error(`✗ ${f.code_facture}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ ${f.code_facture} — ${f.montant.toLocaleString('fr-FR')} FCFA — ${f.notes}`);
      success++;
    }
  }

  console.log(`\nTerminé : ${success} importées, ${errors} erreurs`);
}

main().catch((e) => { console.error(e); process.exit(1); });
