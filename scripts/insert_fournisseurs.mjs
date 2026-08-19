import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csv = readFileSync(join(__dirname, 'liste_fournisseurs.csv'), 'utf-8');
const lines = csv.split(/\r?\n/).filter(Boolean);
const names = lines.slice(1).map((l) => l.trim()).filter(Boolean);

console.log(`Insertion de ${names.length} fournisseurs...`);

const batchSize = 50;
for (let i = 0; i < names.length; i += batchSize) {
  const batch = names.slice(i, i + batchSize).map((nom) => ({ nom }));
  const { error } = await supabase.from('fournisseurs').insert(batch);
  if (error) {
    console.error(`Erreur lot ${i / batchSize + 1}:`, error.message);
  } else {
    console.log(`Lot ${i / batchSize + 1}/${Math.ceil(names.length / batchSize)} inséré (${batch.length} fournisseurs)`);
  }
}

console.log('Terminé');
