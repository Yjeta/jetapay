import { createClient } from '@supabase/supabase-js';

const sup = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const factures = [
  { date: '2025-12-18', code: 'FC-25-041388', montant: 4890 },
  { date: '2025-12-11', code: 'FC-25-040551', montant: 46331 },
  { date: '2025-12-08', code: 'FC-25-040066', montant: 120461 },
  { date: '2025-12-08', code: 'FC-25-040065', montant: 120461 },
  { date: '2025-12-04', code: 'FC-25-039663', montant: 43307 },
  { date: '2025-11-28', code: 'FC-25-039004', montant: 8624273 },
  { date: '2025-10-30', code: 'FC-25-035487', montant: 85861 },
  { date: '2025-10-23', code: 'FC-25-034712', montant: 1354612 },
  { date: '2025-10-20', code: 'FC-25-034309', montant: 452200 },
  { date: '2025-10-10', code: 'FC-25-033415', montant: 422450 },
  { date: '2025-10-10', code: 'FC-25-033313', montant: 26252 },
  { date: '2025-10-10', code: 'FC-25-033311', montant: 860000 },
  { date: '2025-07-30', code: 'FC-25-025821', montant: 2418637 },
];

async function main() {
  const filialeCode = 'LRC';
  const { data: filiales } = await sup.from('filiales').select('id').eq('code', filialeCode);
  if (!filiales?.length) { console.error('Filiale LRC non trouvée'); return; }
  const filialeId = filiales[0].id;

  const { data: existing } = await sup.from('fournisseurs').select('id').ilike('nom', '%diesel gabon%').maybeSingle();
  let fournisseurId;
  if (existing) {
    fournisseurId = existing.id;
    console.log(`Fournisseur DIESEL GABON trouvé : ${fournisseurId}`);
  } else {
    const { data: newFrs, error: frsErr } = await sup.from('fournisseurs').insert({ nom: 'DIESEL GABON', type_personne: 'Morale', statut: 'Actif' }).select('id').single();
    if (frsErr) { console.error('Erreur création fournisseur:', frsErr); return; }
    fournisseurId = newFrs.id;
    console.log(`Fournisseur DIESEL GABON créé : ${fournisseurId}`);
  }

  let imported = 0;
  for (const f of factures) {
    const { error } = await sup.from('factures').insert({
      code_facture: f.code,
      fournisseur_id: fournisseurId,
      filiale_id: filialeId,
      date_facture: f.date,
      date_echeance: f.date,
      montant: f.montant,
      montant_ht: 0,
      tva: 0,
      taxes: 0,
      statut: 'Impayée',
    });
    if (error) {
      console.error(`Erreur ${f.code}:`, error.message);
    } else {
      imported++;
      console.log(`✓ ${f.code} - ${f.montant.toLocaleString()}`);
    }
  }
  console.log(`\nTerminé : ${imported}/${factures.length} factures importées`);
}

main();
