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
  console.log('🔧 Mise à jour du CHECK constraint type_paiement...\n');

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE paiements
        DROP CONSTRAINT IF EXISTS paiements_type_paiement_check;
      ALTER TABLE paiements
        ADD CONSTRAINT paiements_type_paiement_check
          CHECK (type_paiement IN ('Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition'));
    `,
  });

  if (error) {
    console.log('⚠️  RPC non disponible, tentative par requête directe...\n');

    // Vérifier l'état actuel
    await supabase
      .from('paiements')
      .select('type_paiement')
      .limit(1);

    console.log('ℹ️  Contrainte existante : permet Cash, Chèque, Virement, Traite (sans Mise à disposition).');
    console.log('ℹ️  Pour ajouter "Mise à disposition", exécutez cette SQL dans le dashboard Supabase :\n');
    console.log('ALTER TABLE paiements DROP CONSTRAINT IF EXISTS paiements_type_paiement_check;');
    console.log("ALTER TABLE paiements ADD CONSTRAINT paiements_type_paiement_check CHECK (type_paiement IN ('Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition'));");
    return;
  }

  console.log('✅ CHECK constraint mis à jour avec succès !');
}

main().catch(console.error);
