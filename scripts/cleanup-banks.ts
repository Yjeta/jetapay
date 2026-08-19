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

async function main() {
  const codesToRemove = ['BGFI', 'ORABANK', 'ECOBANK', 'AFG'];

  for (const code of codesToRemove) {
    const { error } = await supabase.from('banques').delete().eq('code', code);
    if (error) {
      console.log(`⚠️  ${code} : ${error.message}`);
    } else {
      console.log(`🗑️  Supprimée : ${code}`);
    }
  }

  const { data: final } = await supabase.from('banques').select('*').order('nom');
  console.log(`\n📋 ${final!.length} banques restantes`);
}

main().catch(console.error);
