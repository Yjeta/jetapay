import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const headers = [
  'code_facture',
  'fournisseur',
  'filiale',
  'chantier',
  'date_facture',
  'date_echeance',
  'montant',
  'montant_ht',
  'tva',
  'taxes',
  'reference',
  'notes',
];

const sampleRow = [
  'FACT-001',
  'NOM DU FOURNISSEUR',
  'Code ou nom filiale',
  'Nom du chantier',
  '2025-01-15',
  '2025-02-15',
  100000,
  95000,
  5000,
  0,
  'REF-001',
  'Notes optionnelles',
];

const emptyRow = headers.map(() => '');

const wb = XLSX.utils.book_new();

const data = [
  headers,
  ['', '', '', '', '(JJ-MM-AAAA)', '(JJ-MM-AAAA)', '(montant TTC)', '(hors taxe)', '', '', '', ''],
  sampleRow,
  emptyRow,
  emptyRow,
  emptyRow,
  emptyRow,
  emptyRow,
];
const ws = XLSX.utils.aoa_to_sheet(data);

ws['!cols'] = [
  { wch: 16 },
  { wch: 28 },
  { wch: 20 },
  { wch: 24 },
  { wch: 16 },
  { wch: 16 },
  { wch: 14 },
  { wch: 14 },
  { wch: 10 },
  { wch: 10 },
  { wch: 16 },
  { wch: 24 },
];

XLSX.utils.book_append_sheet(wb, ws, 'Factures');

const outPath = join(__dirname, 'gabarit_import_factures.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`Template généré : ${outPath}`);
