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

async function cleanup() {
  // Supprimer l'ancienne filiale "Bloom Énergie" (code BLOOM) devenue "BLOUM ENERGY" (code BLOUM)
  const { data: old, error: findError } = await supabase
    .from('filiales')
    .select('id, nom, code')
    .eq('code', 'BLOOM');

  if (findError) {
    console.error('❌ Erreur recherche :', findError.message);
    return;
  }

  if (old && old.length > 0) {
    const { error: delError } = await supabase
      .from('filiales')
      .delete()
      .eq('code', 'BLOOM');

    if (delError) {
      console.error('❌ Erreur suppression :', delError.message);
    } else {
      console.log('🗑️  Ancienne filiale "Bloom Énergie" (BLOOM) supprimée');
    }
  } else {
    console.log('✅ Déjà nettoyé');
  }

  const { data: final } = await supabase.from('filiales').select('*').order('nom');
  console.log(`\n📋 ${final!.length} filiales :`);
  final!.forEach((f) => console.log(`   • ${f.nom} (${f.code})`));
}

cleanup().catch(console.error);
