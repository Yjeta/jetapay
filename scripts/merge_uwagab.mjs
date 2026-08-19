// Fusion des 3 fournisseurs contenant "UWAGAB" vers "UWAGAB"
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');
const getEnv = (key) => { const m = envRaw.split('\n').find(l => l.startsWith(key + '=')); if (!m) throw new Error(`Missing ${key}`); return m.split('=').slice(1).join('=').trim(); };

const sup = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const TARGET_ID = '38822727-8fc4-48c9-95e1-e827d3fe44ea'; // UWAGAB
const SOURCE_IDS = [
  '31acf4b8-6429-4a8f-b8c1-8dd63a698dcd', // EMMANUEL CHIKA UZODIMMA-UWAGAB
  '0fb2ee47-310e-4969-b4c7-68e831f485b7', // SOCIETE UWAGAB
];

async function main() {
  // 1. Transférer les paiements
  const { data: p, error: pErr } = await sup
    .from('paiements')
    .update({ fournisseur_id: TARGET_ID })
    .in('fournisseur_id', SOURCE_IDS)
    .select('id');
  if (pErr) throw new Error(`Paiements: ${pErr.message}`);
  console.log(`+ ${p?.length || 0} paiements transférés vers UWAGAB`);

  // 2. Transférer les comptes bancaires
  const { data: c, error: cErr } = await sup
    .from('comptes_bancaires')
    .update({ entite_id: TARGET_ID })
    .eq('entite_type', 'fournisseur')
    .in('entite_id', SOURCE_IDS)
    .select('id');
  if (cErr) throw new Error(`Comptes: ${cErr.message}`);
  console.log(`+ ${c?.length || 0} comptes bancaires transférés`);

  // 3. Supprimer les doublons
  for (const id of SOURCE_IDS) {
    const { data: frs } = await sup.from('fournisseurs').select('nom').eq('id', id).single();
    const { error: dErr } = await sup.from('fournisseurs').delete().eq('id', id);
    if (dErr) throw new Error(`Suppression ${id}: ${dErr.message}`);
    console.log(`- Fournisseur supprimé: ${frs?.nom}`);
  }

  console.log('\nFusion terminée');
}

main().catch((e) => { console.error(e); process.exit(1); });
