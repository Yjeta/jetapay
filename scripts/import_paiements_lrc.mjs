// Import des paiements LRC du 02/10/2025
// Usage: npx tsx scripts/import_paiements_lrc.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');
const getEnv = (k) => { const m = envRaw.split('\n').find(l => l.startsWith(k+'=')); if (!m) throw new Error('Missing '+k); return m.split('=').slice(1).join('=').trim(); };

const sup = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));

const paiements = [
  { fournisseur: 'OUVRAGES STRUCTURES INGENIERIE', montant: 12089700, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'LEME-CONSTRUCTION', montant: 30000000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'ETABLISSEMENTS NZE', montant: 40000000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'URBAN BTP', montant: 40000000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'SGCRI', montant: 23401000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'PEPE DECORS', montant: 15000000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'ACCEGS', montant: 7129000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'CNSS', montant: 6117002, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'CNSS', montant: 8382461, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
  { fournisseur: 'OUSSEYNOU CONSTRUCTION', montant: 40000000, date: '2025-10-02', type: 'Virement', statut: 'Validé' },
];

// Map fournisseur names with possible variations
const frsNameMap = {
  'OUVRAGES STRUCTURES INGENIERIE': 'OUVRAGE STRUCTURES INGENIERIE',
  'LEME-CONSTRUCTION': 'LEME CONSTRUCTION',
  'ETABLISSEMENTS NZE': 'ETABLISSEMENT NZE',
};

async function main() {
  // Filiale LRC
  const { data: filiales } = await sup.from('filiales').select('id').eq('code', 'LRC');
  if (!filiales?.length) { console.error('Filiale LRC introuvable'); return; }
  const filialeId = filiales[0].id;
  console.log('Filiale LRC:', filialeId);

  // Compte BGFIBank Gabon for LRC
  const { data: banques } = await sup.from('banques').select('id').ilike('nom', '%BGFI%Gabon%');
  if (!banques?.length) { console.error('Banque BGFIBank Gabon introuvable'); return; }
  const banqueId = banques[0].id;
  const { data: comptes } = await sup.from('comptes_bancaires').select('id').eq('entite_id', filialeId).eq('banque_id', banqueId);
  if (!comptes?.length) { console.error('Compte BGFIBank pour LRC introuvable'); return; }
  const compteId = comptes[0].id;
  console.log('Compte BGFIBank LRC:', compteId);

  // Pre-comptage pour la génération de codes
  const year = 2025;
  const { data: existing } = await sup
    .from('paiements')
    .select('code_paiement')
    .ilike('code_paiement', 'PAI-LRC-' + year + '-%')
    .order('code_paiement', { ascending: false })
    .limit(1);
  let seq = 1;
  if (existing && existing.length > 0) {
    const lastCode = existing[0].code_paiement;
    seq = parseInt(lastCode.split('-').pop(), 10) + 1;
  }
  console.log('Sequence start:', seq);

  let success = 0, errors = 0;

  for (const p of paiements) {
    // Find fournisseur
    const searchName = frsNameMap[p.fournisseur] || p.fournisseur;
    const { data: frs } = await sup.from('fournisseurs').select('id').ilike('nom', searchName);
    if (!frs?.length) {
      console.error('✗ Fournisseur introuvable: ' + p.fournisseur);
      errors++;
      continue;
    }
    const fournisseurId = frs[0].id;

    const code = `PAI-LRC-${year}-${seq.toString().padStart(4, '0')}`;
    seq++;

    const { error } = await sup.from('paiements').insert({
      code_paiement: code,
      date_paiement: p.date,
      filiale_id: filialeId,
      fournisseur_id: fournisseurId,
      montant: p.montant,
      type_paiement: p.type,
      statut: p.statut,
      compte_bancaire_id: compteId,
    });

    if (error) {
      console.error('✗ ' + p.fournisseur + ': ' + error.message);
      errors++;
    } else {
      console.log('✓ ' + code + ' — ' + p.fournisseur + ' — ' + p.montant.toLocaleString('fr-FR') + ' FCFA');
      success++;
    }
  }

  console.log('\nTerminé : ' + success + ' succès, ' + errors + ' erreurs');
}

main().catch(console.error);
