import { supabase } from './supabase';

export function formatRIB(rib: string): string {
  const clean = rib.replace(/[\s-]/g, '');
  if (clean.length !== 23) return rib;
  return `${clean.slice(0, 5)} ${clean.slice(5, 10)} ${clean.slice(10, 21)} ${clean.slice(21)}`;
}

export function validateRIB(ribValue: string): string {
  if (typeof ribValue !== 'string') return 'Entrée Invalide';
  const cleanRib = ribValue.replace(/[\s-]/g, '');
  if (cleanRib.length !== 23) return 'Format Incorrect';
  const bankCode = cleanRib.slice(0, 5);
  const branchCode = cleanRib.slice(5, 10);
  const accountNumber = cleanRib.slice(10, 21);
  const providedKey = cleanRib.slice(21, 23);
  if (!/^\d{5}$/.test(bankCode) || !/^\d{5}$/.test(branchCode) || !/^\d{11}$/.test(accountNumber) || !/^\d{2}$/.test(providedKey)) return 'Format Incorrect';
  const numberStr = bankCode + branchCode + accountNumber;
  let current = 0;
  for (let i = 0; i < numberStr.length; i++) current = (current * 10 + parseInt(numberStr[i], 10)) % 97;
  const temp = (current * 100) % 97;
  const calculatedKey = (97 - temp) % 97;
  return providedKey === calculatedKey.toString().padStart(2, '0') ? 'Valide' : 'Invalide';
}

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

function convertBelow1000(n: number): string {
  if (n === 0) return '';
  const cent = Math.floor(n / 100);
  const reste = n % 100;
  let result = '';
  if (cent > 0) {
    result += cent === 1 ? 'cent' : `${UNITS[cent]}-cent`;
    if (reste === 0 && cent > 1) result += 's';
  }
  if (reste > 0) {
    if (result) result += '-';
    if (reste < 10) {
      result += UNITS[reste];
    } else if (reste < 20) {
      result += TEENS[reste - 10];
    } else {
      const d = Math.floor(reste / 10);
      const u = reste % 10;
      if (d === 7 || d === 9) {
        result += d === 7 ? 'soixante' : 'quatre-vingt';
        result += u === 1 && d === 7 ? '-et-onze' : `-${TEENS[u + (d === 7 ? 0 : 10)]}`;
      } else {
        result += TENS[d];
        if (u === 1 && d < 7) {
          result += '-et-un';
        } else if (u > 0) {
          result += `-${UNITS[u]}`;
        }
      }
    }
  }
  return result;
}

export function numberToWords(amount: number): string {
  if (amount === 0) return 'zéro franc CFA';
  const millions = Math.floor(amount / 1000000);
  const milliers = Math.floor((amount % 1000000) / 1000);
  const reste = amount % 1000;
  const parts: string[] = [];
  if (millions > 0) {
    const m = convertBelow1000(millions);
    parts.push(millions === 1 ? 'un million' : `${m} millions`);
  }
  if (milliers > 0) {
    const m = convertBelow1000(milliers);
    parts.push(milliers === 1 ? 'mille' : `${m} mille`);
  }
  if (reste > 0) {
    parts.push(convertBelow1000(reste));
  }
  const words = parts.join('-');
  return amount > 1 ? `${words} francs CFA` : `${words} franc CFA`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/\s/g, '.');
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function exportToCSV(filename: string, headers: string[], rows: string[][]): void {
  const csv = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function generateCodeLettrage(fournisseurId?: string): Promise<string> {
  let count = 0;
  if (fournisseurId) {
    const { data: factures } = await supabase
      .from('factures')
      .select('id')
      .eq('fournisseur_id', fournisseurId);
    const factureIds = (factures || []).map((f) => f.id);
    if (factureIds.length > 0) {
      const { count: c } = await supabase
        .from('paiement_factures')
        .select('*', { count: 'exact', head: true })
        .not('code_lettrage', 'is', null)
        .in('facture_id', factureIds);
      count = c || 0;
    }
  } else {
    const { count: c } = await supabase
      .from('paiement_factures')
      .select('*', { count: 'exact', head: true })
      .not('code_lettrage', 'is', null);
    count = c || 0;
  }
  const seq = (count + 1).toString().padStart(3, '0');
  return `A${seq}`;
}

export async function generateCodePaiement(filialeCode?: string): Promise<string> {
  const year = new Date().getFullYear();
  let query = supabase
    .from('paiements')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`);
  if (filialeCode) {
    const { data: filiale } = await supabase.from('filiales').select('id').eq('code', filialeCode).single();
    if (filiale) query = query.eq('filiale_id', filiale.id);
  }
  const { count } = await query;
  const seq = ((count || 0) + 1).toString().padStart(4, '0');
  const prefix = filialeCode ? `PAI-${filialeCode}` : 'PAI';
  return `${prefix}-${year}-${seq}`;
}
