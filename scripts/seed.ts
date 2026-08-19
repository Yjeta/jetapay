import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
const envRaw = readFileSync(envPath, 'utf-8');

function getEnv(key: string): string {
  const match = envRaw.split('\n').find((l) => l.startsWith(key + '='));
  if (!match) throw new Error(`Missing ${key} in .env`);
  return match.split('=').slice(1).join('=').trim();
}

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = getEnv('VITE_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

const filiales = [
  { nom: 'JETA GROUPE HOLDING', code: 'JH', description: 'Holding du groupe JETA' },
  { nom: 'JETA ENGINEERING SA', code: 'JENG', description: 'Filiale d\'ingénierie et de construction' },
  { nom: 'PREMIUM MOTORS', code: 'PMOT', description: 'Filiale automobile du groupe JETA' },
  { nom: 'AFRICAN FRET & SERVICE', code: 'AFS', description: 'Filiale de fret et services logistiques' },
  { nom: 'BLOUM ENERGY', code: 'BLOUM', description: 'Filiale d\'énergies renouvelables' },
  { nom: 'LE ROI DES CHANTIERS', code: 'LRC', description: 'Filiale BTP et infrastructure (Le Roi des Chantiers)' },
  { nom: 'SABUREAUTEL', code: 'SABUR', description: 'Filiale d\'informatique et télécommunications' },
  { nom: 'AFRICAN TERMINAL TRANSPORT', code: 'ATT', description: 'Filiale de transport et logistique' },
  { nom: 'ADS & CO', code: 'ADS', description: 'Filiale de communication et publicité' },
  { nom: 'SCI JETA', code: 'SCI', description: 'Société Civile Immobilière du groupe JETA' },
  { nom: 'JETA CONSULTING', code: 'JCONS', description: 'Filiale de conseil et consulting' },
  { nom: 'JETACOMM', code: 'JCOMM', description: 'Filiale de communication' },
  { nom: 'TROPIGAB', code: 'TGAB', description: 'Filiale d\'import-export et négoce' },
  { nom: 'JETA WOOD', code: 'JWOOD', description: 'Filiale d\'exploitation forestière' },
];

async function seed() {
  console.log('🚀 Début du seed des filiales JETA GROUPE...\n');

  const { data: existing } = await supabase.from('filiales').select('code');
  const existingCodes = new Set((existing || []).map((f) => f.code));
  console.log(`📊 Filiales existantes : ${existingCodes.size}\n`);

  for (const f of filiales) {
    if (existingCodes.has(f.code)) {
      const { error } = await supabase
        .from('filiales')
        .update({ nom: f.nom, description: f.description })
        .eq('code', f.code);
      if (error) {
        console.log(`❌ Échec mise à jour ${f.code} : ${error.message}`);
      } else {
        console.log(`🔄 Mis à jour : ${f.nom} (${f.code})`);
      }
    } else {
      const { error } = await supabase.from('filiales').insert({
        nom: f.nom,
        code: f.code,
        description: f.description,
      });
      if (error) {
        console.log(`❌ Échec insertion ${f.code} : ${error.message}`);
      } else {
        console.log(`✅ Inséré : ${f.nom} (${f.code})`);
      }
    }
  }

  console.log('\n📋 Vérification finale...');
  const { data: final, error: finalError } = await supabase
    .from('filiales')
    .select('*')
    .order('nom');

  if (finalError) {
    console.log(`❌ Erreur vérification : ${finalError.message}`);
  } else {
    console.log(`\n✅ ${final!.length} filiales enregistrées :`);
    final!.forEach((f) => console.log(`   • ${f.nom} (${f.code})`));
  }
}

seed().catch(console.error);
