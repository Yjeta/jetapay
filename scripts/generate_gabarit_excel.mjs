import * as XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const wb = XLSX.utils.book_new();
const data = [
  {
    code_paiement: '',
    date_paiement: '2026-01-15',
    filiale: 'NOM_FILIALE',
    fournisseur: 'NOM_FOURNISSEUR',
    montant: 1500000,
    type_paiement: 'Virement',
    statut: 'Validé',
    banque: 'BICIG',
    numero_compte: 'XXXX-XXXX',
    beneficiaire: 'NOM_BENEF',
    reference: 'REF-001',
    notes: '',
  },
  {
    code_paiement: '',
    date_paiement: '2026-01-16',
    filiale: 'NOM_FILIALE',
    fournisseur: 'NOM_FOURNISSEUR',
    montant: 50000,
    type_paiement: 'Cash',
    statut: 'Validé',
    banque: '',
    numero_compte: '',
    beneficiaire: '',
    reference: '',
    notes: '',
  },
];

const ws = XLSX.utils.json_to_sheet(data);

const colWidths = [
  { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 22 },
  { wch: 12 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
  { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 20 },
];
ws['!cols'] = colWidths;

XLSX.utils.book_append_sheet(wb, ws, 'Import Paiements');

const outPath = join(__dirname, 'gabarit_import_paiements.xlsx');
XLSX.writeFile(wb, outPath);
console.log(`Gabarit Excel généré : ${outPath}`);

const publicPath = join(__dirname, '..', 'public', 'gabarit_import_paiements.xlsx');
XLSX.writeFile(wb, publicPath);
console.log(`Copié vers public : ${publicPath}`);
