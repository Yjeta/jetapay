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

async function updateCodes() {
  console.log('Mise à jour des codes filiales...\n');

  const { error: err1 } = await supabase
    .from('filiales')
    .update({ code: 'JENG' })
    .eq('code', 'JETA');
  if (err1) {
    console.log('❌ Échec mise à jour JETA → JENG : ' + err1.message);
  } else {
    console.log('✅ JETA → JENG');
  }

  const { error: err2 } = await supabase
    .from('filiales')
    .update({ code: 'JH' })
    .eq('code', 'HOLDING');
  if (err2) {
    console.log('❌ Échec mise à jour HOLDING → JH : ' + err2.message);
  } else {
    console.log('✅ HOLDING → JH');
  }

  // Mettre à jour les codes_paiement dans la table paiements
  console.log('\nMise à jour des codes_paiement...\n');

  const replacements = [
    { old: 'PAI-JETA-', newPrefix: 'PAI-JENG-' },
    { old: 'PAI-HOLDING-', newPrefix: 'PAI-JH-' },
  ];

  for (const r of replacements) {
    const { data: paiements, error: fetchErr } = await supabase
      .from('paiements')
      .select('id, code_paiement')
      .ilike('code_paiement', r.old + '%');

    if (fetchErr) {
      console.log(`❌ Erreur chargement paiements ${r.old}: ${fetchErr.message}`);
      continue;
    }

    if (!paiements || paiements.length === 0) {
      console.log(`ℹ️ Aucun paiement avec ${r.old}`);
      continue;
    }

    for (const p of paiements) {
      const newCode = p.code_paiement.replace(r.old, r.newPrefix);
      const { error: updateErr } = await supabase
        .from('paiements')
        .update({ code_paiement: newCode })
        .eq('id', p.id);

      if (updateErr) {
        console.log(`❌ Erreur mise à jour ${p.code_paiement} → ${newCode}: ${updateErr.message}`);
      } else {
        console.log(`✅ ${p.code_paiement} → ${newCode}`);
      }
    }
  }

  const { data: final } = await supabase
    .from('filiales')
    .select('*')
    .order('nom');
  console.log('\nFiliales :');
  (final || []).forEach((f) => console.log(`  • ${f.nom} (${f.code})`));
}

updateCodes().catch(console.error);
