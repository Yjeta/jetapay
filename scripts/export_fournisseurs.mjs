import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase.from('fournisseurs').select('*').order('nom');
if (error) { console.error('Erreur:', error.message); process.exit(1); }

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data.map((f) => ({
  Nom: f.nom,
  'Domaine activité': f.domaine_activite || '',
  Contact: f.contact || '',
  Téléphone: f.telephone || '',
  Email: f.email || '',
  Adresse: f.adresse || '',
})));

ws['!cols'] = [
  { wch: 50 }, { wch: 30 }, { wch: 25 }, { wch: 20 }, { wch: 35 }, { wch: 35 },
];

XLSX.utils.book_append_sheet(wb, ws, 'Fournisseurs');
const outPath = join(__dirname, 'fournisseurs.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`Exporté ${data.length} fournisseurs → ${outPath}`);
