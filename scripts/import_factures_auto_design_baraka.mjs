// Script d'import des factures AUTO DESIGN BARAKA
// Usage: node --env-file .env scripts/import_factures_auto_design_baraka.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définis dans .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const parseMontant = (s) => {
  const cleaned = String(s).replace(/\./g, '').replace(/,/g, '');
  return parseFloat(cleaned);
};

const factures = [
  { code: '2025AD19', date: '2024-01-15', montant_ht: 752941178, tva: 135529412, taxes: 7529412, montant: 896000000, vehicules: 38 },
  { code: '2024AA80/ADB', date: '2024-03-18', montant_ht: 85714286, tva: 15428571, taxes: 857143, montant: 102000000, vehicules: 2 },
  { code: '2025AD20', date: '2024-01-15', montant_ht: 586134455, tva: 105504202, taxes: 5861345, montant: 697500000, vehicules: 25 },
  { code: '2025AD21', date: '2024-01-15', montant_ht: 362184874, tva: 65193277, taxes: 3621849, montant: 431000000, vehicules: 6 },
  { code: '2025AD22', date: '2024-01-15', montant_ht: 342857143, tva: 61714286, taxes: 3428571, montant: 408000000, vehicules: 5 },
  { code: '2025AD23', date: '2024-01-15', montant_ht: 180252102, tva: 32445378, taxes: 1802521, montant: 214500000, vehicules: 13 },
  { code: '2025AD24', date: '2024-01-15', montant_ht: 163025209, tva: 29344538, taxes: 1630252, montant: 194000000, vehicules: 5 },
  { code: '2025AD25', date: '2024-01-15', montant_ht: 90756303, tva: 16336135, taxes: 907563, montant: 108000000, vehicules: 3 },
];

async function main() {
  // Récupérer le fournisseur AUTO DESIGN BARAKA
  const { data: fournisseurs, error: errFour } = await supabase
    .from('fournisseurs')
    .select('id')
    .ilike('nom', '%AUTO DESIGN BARAKA%');
  if (errFour) { console.error('Erreur fournisseur:', errFour); return; }
  if (!fournisseurs || fournisseurs.length === 0) { console.error('Fournisseur AUTO DESIGN BARAKA introuvable'); return; }
  const fournisseurId = fournisseurs[0].id;
  console.log('Fournisseur ID:', fournisseurId);

  // Récupérer la filiale PREMIUM MOTORS
  const { data: filiales, error: errFil } = await supabase
    .from('filiales')
    .select('id')
    .ilike('nom', '%PREMIUM MOTORS%');
  if (errFil) { console.error('Erreur filiale:', errFil); return; }
  if (!filiales || filiales.length === 0) { console.error('Filiale PREMIUM MOTORS introuvable'); return; }
  const filialeId = filiales[0].id;
  console.log('Filiale ID:', filialeId);

  let success = 0;
  let errors = 0;

  for (const f of factures) {
    const { error } = await supabase.from('factures').insert({
      code_facture: f.code,
      fournisseur_id: fournisseurId,
      filiale_id: filialeId,
      date_facture: f.date,
      date_echeance: f.date,
      montant: f.montant,
      montant_ht: f.montant_ht,
      tva: f.tva,
      taxes: f.taxes,
      statut: 'Impayée',
    });
    if (error) {
      console.error(`Erreur facture ${f.code}: ${error.message}`);
      errors++;
    } else {
      console.log(`✓ Facture ${f.code} importée (${f.montant.toLocaleString('fr-FR')} FCFA)`);
      success++;
    }
  }

  console.log(`\nTerminé : ${success} succès, ${errors} erreurs`);
}

main();
