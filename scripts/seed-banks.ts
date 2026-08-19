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

const banques = [
  // Cameroun
  { nom: 'Banque Internationale du Cameroun pour l\'Epargne et le Credit', code: '10001' },
  { nom: 'SCB Cameroun', code: '10002' },
  { nom: 'Société Générale Cameroun', code: '10003' },
  { nom: 'Standard Chartered Bank Cameroun', code: '10004' },
  { nom: 'Afriland First Bank Cameroun', code: '10005' },
  { nom: 'Amity Bank Cameroun', code: '10006' },
  { nom: 'Citibank N.A. Cameroun', code: '10007' },
  { nom: 'Commercial Bank Cameroun', code: '10008' },
  { nom: 'Credit Foncier du Cameroun', code: '10019' },
  { nom: 'Union Bank Cameroun', code: '10023' },
  { nom: 'NFC Bank Cameroun', code: '10025' },
  { nom: 'Ecobank Cameroun', code: '10029' },
  { nom: 'UBA Cameroun', code: '10033' },
  { nom: 'AFG Bank Cameroun', code: '10034' },
  { nom: 'BGFI Bank Cameroun', code: '10035' },
  { nom: 'Access Bank Cameroun', code: '10041' },
  { nom: 'Trésor Public Cameroun', code: '12001' },
  { nom: 'Cameroun Postal Services', code: '12003' },
  // Centrafrique
  { nom: 'Ecobank République Centrafrique', code: '20001' },
  { nom: 'Commercial Bank Centrafrique', code: '20002' },
  { nom: 'Banque Populaire Maroco-Centrafricaine', code: '20003' },
  { nom: 'BSIC RCA', code: '20005' },
  // Congo
  { nom: 'MUCODEC Congo', code: '30005' },
  { nom: 'BGFIBank Congo', code: '30008' },
  { nom: 'Banque Centrale du Congo', code: '30011' },
  { nom: 'La Congolaise de Banque Congo', code: '30012' },
  { nom: 'Banque Commerciale Internationale Congo', code: '30013' },
  { nom: 'Ecobank Congo', code: '30014' },
  { nom: 'Banque Congolaise de l\'Habitat Congo', code: '30015' },
  { nom: 'UBA Congo', code: '30016' },
  { nom: 'Banque Espirito Santos Congo', code: '30017' },
  { nom: 'Société Générale Congo', code: '30018' },
  { nom: 'Banque Postale du Congo', code: '30019' },
  { nom: 'Banque Sino-Congolaise', code: '30020' },
  { nom: 'Trésor Public Congo', code: '32001' },
  { nom: 'SOPECO Congo', code: '32002' },
  // Gabon
  { nom: 'AFG Bank Gabon', code: '40001' },
  { nom: 'Union Gabonaise de Banque', code: '40002' },
  { nom: 'BGFIBank Gabon', code: '40003' },
  { nom: 'Banque Gabonaise de Développement', code: '40004' },
  { nom: 'Citibank N.A. Gabon', code: '40005' },
  { nom: 'Orabank Gabon', code: '40021' },
  { nom: 'Banque de l\'Habitat du Gabon', code: '40023' },
  { nom: 'Ecobank Gabon', code: '40024' },
  { nom: 'UBA Gabon', code: '40025' },
  { nom: 'Poste Bank', code: '40026' },
  { nom: 'BCEG', code: '40028' },
  { nom: 'Trésor Public Gabon', code: '42001' },
  // Guinée Équatoriale
  { nom: 'CCEI Bank Guinée Équatoriale', code: '50001' },
  { nom: 'Société Générale de Banques en Guinée Équatoriale', code: '50002' },
  { nom: 'BGFIBank Guinée', code: '50004' },
  { nom: 'Banco Nacional de Guinea Ecuatorial', code: '50005' },
  { nom: 'Ecobank Guinée Équatoriale', code: '50006' },
  { nom: 'Trésor Guinée Équatoriale', code: '52001' },
  // Tchad
  { nom: 'Ecobank Tchad', code: '60001' },
  { nom: 'Société Générale Tchad', code: '60002' },
  { nom: 'Commercial Bank Tchad', code: '60003' },
  { nom: 'Banque Commerciale du Chari Tchad', code: '60004' },
  { nom: 'Orabank Tchad SA', code: '60005' },
  { nom: 'BAC Tchad', code: '60006' },
  { nom: 'BSIC Tchad', code: '60007' },
  { nom: 'UBA Tchad', code: '60008' },
  { nom: 'Trésor du Tchad', code: '62001' },
];

async function main() {
  console.log('🏦 Seed des banques CEMAC...\n');

  const { data: existing } = await supabase.from('banques').select('code');
  const existingCodes = new Set((existing || []).map((b) => b.code));
  console.log(`📊 Banques existantes : ${existingCodes.size}\n`);

  let inserted = 0;
  let skipped = 0;

  for (const b of banques) {
    if (existingCodes.has(b.code)) {
      const { error } = await supabase
        .from('banques')
        .update({ nom: b.nom })
        .eq('code', b.code);
      if (error) {
        console.log(`❌ ${b.code} : ${error.message}`);
      } else {
        skipped++;
      }
    } else {
      const { error } = await supabase.from('banques').insert(b);
      if (error) {
        console.log(`❌ ${b.code} : ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  console.log(`\n✅ ${inserted} insérées, ${skipped} déjà existantes`);

  const { data: final } = await supabase.from('banques').select('*').order('nom');
  console.log(`\n📋 ${final!.length} banques au total :`);
  final!.forEach((b) => console.log(`   • ${b.nom} (${b.code})`));
}

main().catch(console.error);
