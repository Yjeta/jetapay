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
  console.log('🔍 Vérification de la base...\n');

  for (const table of ['filiales', 'banques', 'fournisseurs', 'comptes_bancaires', 'paiements'] as const) {
    const { data, error } = await supabase.from(table).select('*').limit(5);
    if (error) {
      console.log(`❌ ${table} : ${error.message}`);
    } else {
      console.log(`✅ ${table} : ${data!.length} lignes`);
      if (data!.length > 0) {
        console.log(`   → ${JSON.stringify(data![0])}`);
      }
    }
    console.log();
  }
}

main().catch(console.error);
