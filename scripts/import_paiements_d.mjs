import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const XLSX_PATH = join(__dirname, 'D.xlsx');
console.log('Lecture de', XLSX_PATH);

const buf = readFileSync(XLSX_PATH);
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
const headers = raw[0].map((h) => String(h).trim().toLowerCase());
console.log('Headers:', headers);

const rows = raw.slice(1).filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''));
console.log('Total lignes :', rows.length);

function serialToDate(num) {
  if (num > 40000 && num < 250000) {
    const d = new Date((num - 25569) * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return String(num);
}

const parsed = rows.map((r) => {
  const obj = {};
  headers.forEach((h, i) => {
    const val = r[i];
    if (val === undefined || val === null) { obj[h] = ''; return; }
    const s = String(val).trim();
    if (/^-?\d+(\.\d+)?$/.test(s) && !isNaN(Number(s))) {
      const num = Number(s);
      if (num > 40000 && num < 250000) {
        obj[h] = serialToDate(num);
      } else {
        obj[h] = s;
      }
    } else {
      obj[h] = s;
    }
  });
  return obj;
});

console.log('Chargement des références...');
const [filRes, frsRes, banRes, cptRes, benRes] = await Promise.all([
  supabase.from('filiales').select('id, nom'),
  supabase.from('fournisseurs').select('id, nom'),
  supabase.from('banques').select('id, nom'),
  supabase.from('comptes_bancaires').select('id, numero_compte, banque:banques(nom)'),
  supabase.from('beneficiaires').select('id, nom'),
]);

const filialeMap = new Map((filRes.data || []).map((f) => [f.nom.toLowerCase(), f.id]));
const frsMap = new Map((frsRes.data || []).map((f) => [f.nom.toLowerCase(), f.id]));
const benefMap = new Map((benRes.data || []).map((b) => [b.nom.toLowerCase(), b.id]));
const compteByNumero = new Map((cptRes.data || []).map((c) => [c.numero_compte, c.id]));
const compteByBanque = new Map();
for (const c of (cptRes.data || [])) {
  const bn = c.banque?.nom?.toLowerCase() || '';
  if (!compteByBanque.has(bn)) compteByBanque.set(bn, []);
  compteByBanque.get(bn).push(c.id);
}

const paiements = [];
const errors = [];
const typesDB = ['Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition', 'Opération bancaire'];
const statutsValides = ['Validé', 'En attente', 'Rejeté', 'Annulé'];

for (let i = 0; i < parsed.length; i++) {
  const r = parsed[i];
  const rowNum = i + 1;

  if (!r.date_paiement) { errors.push({ row: rowNum, msg: 'Date manquante' }); continue; }
  const montant = parseFloat((r.montant || '').replace(/\s/g, '').replace(',', '.'));
  if (isNaN(montant)) { errors.push({ row: rowNum, msg: 'Montant invalide: "' + r.montant + '"' }); continue; }

  if (!r.filiale) { errors.push({ row: rowNum, msg: 'Filiale manquante' }); continue; }
  const filialeId = filialeMap.get(r.filiale.toLowerCase());
  if (!filialeId) { errors.push({ row: rowNum, msg: 'Filiale introuvable: "' + r.filiale + '"' }); continue; }

  let fournisseur_id = null;
  if (r.fournisseur) {
    const frsId = frsMap.get(r.fournisseur.toLowerCase());
    if (!frsId) { errors.push({ row: rowNum, msg: 'Fournisseur introuvable: "' + r.fournisseur + '"' }); continue; }
    fournisseur_id = frsId;
  }

  let compte_bancaire_id = null;
  if (r.banque) {
    const banqueNorm = r.banque.toLowerCase();
    compte_bancaire_id = r.numero_compte ? (compteByNumero.get(r.numero_compte.trim()) || null) : null;
    if (!compte_bancaire_id) {
      const ids = compteByBanque.get(banqueNorm);
      if (ids && ids.length > 0) compte_bancaire_id = ids[0];
    }
  }

  let beneficiaire_id = null;
  if (r.beneficiaire) {
    beneficiaire_id = benefMap.get(r.beneficiaire.toLowerCase()) || null;
  }

  if (!typesDB.includes(r.type_paiement)) { errors.push({ row: rowNum, msg: 'Type "' + r.type_paiement + '" non autorisé par la base (exécutez scripts/alter_constraint_type_paiement.sql dans l\'éditeur SQL Supabase)' }); continue; }
  if (!statutsValides.includes(r.statut)) { errors.push({ row: rowNum, msg: 'Statut invalide: "' + r.statut + '"' }); continue; }

  const year = new Date().getFullYear();
  const code = r.code_paiement || ('PAI-' + year + '-' + String(i + 1).padStart(4, '0'));

  paiements.push({
    code_paiement: code,
    date_paiement: r.date_paiement,
    filiale_id: filialeId,
    fournisseur_id,
    montant,
    type_paiement: r.type_paiement,
    statut: r.statut,
    compte_bancaire_id,
    reference: r.reference || null,
    notes: r.notes || null,
  });
}

if (errors.length > 0) {
  console.error('\n' + errors.length + ' erreur(s) de validation :');
  errors.slice(0, 30).forEach((e) => console.error('  Ligne ' + e.row + ': ' + e.msg));
  if (errors.length > 30) console.error('  ... et ' + (errors.length - 30) + ' autre(s)');
  process.exit(1);
}

console.log('\n' + paiements.length + ' lignes valides. Insertion...');

const BATCH = 100;
let success = 0;
for (let i = 0; i < paiements.length; i += BATCH) {
  const batch = paiements.slice(i, i + BATCH);
  const { error } = await supabase.from('paiements').insert(batch);
  if (error) {
    console.error('Erreur lot ' + (i / BATCH + 1) + ': ' + error.message);
  } else {
    success += batch.length;
    console.log('Lot ' + (i / BATCH + 1) + '/' + Math.ceil(paiements.length / BATCH) + ': ' + batch.length + ' insérés');
  }
}

console.log('\nTerminé : ' + success + '/' + paiements.length + ' paiements importés');
