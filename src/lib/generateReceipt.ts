import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';
import type { Filiale } from '../types';

interface JsPDFWithAutoTable extends jsPDF {
  lastAutoTable: { finalY: number };
}

export interface ReceiptData {
  code_paiement: string;
  date_paiement: string;
  filiale_nom: string;
  filiale_code: string;
  beneficiaire_nom: string;
  type_paiement: string;
  montant: number;
  reference: string | null;
  statut: string;
  banque_nom: string | null;
  rib: string | null;
  notes: string | null;
}

type RGB = { r: number; g: number; b: number };
function rgb(col: RGB): [number, number, number] { return [col.r, col.g, col.b]; }

const JETA: Record<string, RGB> = {
  blue:       { r: 0,   g: 104, b: 214 },
  blueDark:   { r: 0,   g: 76,  b: 179 },
  green:      { r: 69,  g: 214, b: 31  },
  greenDark:  { r: 35,  g: 155, b: 22  },
  red:        { r: 244, g: 0,   b: 0   },
  amber:      { r: 245, g: 158, b: 11  },
  purple:     { r: 139, g: 92,  b: 246 },
  pink:       { r: 236, g: 72,  b: 153 },
  navy:       { r: 15,  g: 23,  b: 42  },
  slate:      { r: 71,  g: 85,  b: 105 },
  slateLight: { r: 148, g: 163, b: 184 },
  grayBg:     { r: 248, g: 250, b: 252 },
  grayBorder: { r: 229, g: 231, b: 235 },
  white:      { r: 255, g: 255, b: 255 },
};

/* =========================================================
   CONVERSION NOMBRE → LETTRES (français, CFA)
   ========================================================= */
const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS  = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

function lessThanHundred(n: number): string {
  if (n < 10) return UNITS[n];
  if (n >= 10 && n < 20) return TEENS[n - 10];

  if (n < 70) {
    const u = n % 10;
    const d = Math.floor(n / 10);
    if (u === 0) return TENS[d];
    if (u === 1 && (d === 2 || d === 3 || d === 4 || d === 5 || d === 6)) {
      return `${TENS[d]}-et-${UNITS[u]}`;
    }
    return `${TENS[d]}-${UNITS[u]}`;
  }

  if (n < 80) {
    return `soixante-${TEENS[n - 70]}`;
  }

  if (n < 100) {
    const rest = n - 80;
    if (rest === 0) return 'quatre-vingts';
    if (rest < 10) return `quatre-vingt-${UNITS[rest]}`;
    return `quatre-vingt-${TEENS[rest - 10]}`;
  }

  return String(n);
}

function lessThanThousand(n: number): string {
  if (n < 100) return lessThanHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (rest === 0) {
    return h === 1 ? 'cent' : `${UNITS[h]}-cents`;
  }
  const restText = lessThanHundred(rest);
  return h === 1 ? `cent-${restText}` : `${UNITS[h]}-cent-${restText}`;
}

export function numberToWords(n: number): string {
  if (n === 0) return 'zéro Francs CFA';
  if (n < 0) return `moins ${numberToWords(-n)}`;

  const parts: string[] = [];
  let remaining = Math.floor(n);

  // Milliards
  if (remaining >= 1_000_000_000) {
    const b = Math.floor(remaining / 1_000_000_000);
    parts.push(b === 1 ? 'un-milliard' : `${lessThanThousand(b)}-milliards`);
    remaining %= 1_000_000_000;
  }

  // Millions
  if (remaining >= 1_000_000) {
    const m = Math.floor(remaining / 1_000_000);
    parts.push(m === 1 ? 'un-million' : `${lessThanThousand(m)}-millions`);
    remaining %= 1_000_000;
  }

  // Milliers
  if (remaining >= 1_000) {
    const t = Math.floor(remaining / 1_000);
    if (t === 1) {
      parts.push('mille');
    } else {
      parts.push(`${lessThanThousand(t)}-mille`);
    }
    remaining %= 1_000;
  }

  // Reste
  if (remaining > 0) {
    parts.push(lessThanThousand(remaining));
  }

  // Assemblage + "Francs CFA"
  const text = parts.join('-').replace(/-/g, ' ');
  return `${text} Francs CFA`;
}

/* =========================================================
   PDF GENERATION
   ========================================================= */

function drawGradientRect(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  from: RGB, to: RGB, steps = 20,
) {
  const slice = h / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    doc.setFillColor(
      Math.round(from.r + (to.r - from.r) * t),
      Math.round(from.g + (to.g - from.g) * t),
      Math.round(from.b + (to.b - from.b) * t),
    );
    doc.rect(x, y + i * slice, w, slice + 0.2, 'F');
  }
}

function drawStatusBadge(doc: jsPDF, x: number, y: number, statut: string) {
  const s = (statut || '').toLowerCase();
  let bg: RGB;
  let fg: RGB;
  if (s === 'payé' || s === 'paid') {
    bg = JETA.green; fg = JETA.white;
  } else if (s === 'annulé' || s === 'cancelled') {
    bg = JETA.red; fg = JETA.white;
  } else {
    bg = JETA.amber; fg = { r: 30, g: 30, b: 30 };
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const tw = doc.getTextWidth(statut || '—');
  const bw = tw + 8;
  const bh = 7;
  doc.setFillColor(bg.r, bg.g, bg.b);
  doc.roundedRect(x, y - 5, bw, bh, 2, 2, 'F');
  doc.setTextColor(fg.r, fg.g, fg.b);
  doc.text(statut || '—', x + bw / 2, y + 0.2, { align: 'center' });
  return bw;
}

export function generatePaymentReceipt(data: ReceiptData) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - 2 * margin;
  let y = 0;

  // --- HEADER COMPACT ---
  drawGradientRect(doc, 0, 0, pageW, 12, { r: 26, g: 26, b: 46 }, { r: 22, g: 33, b: 62 });
  doc.setFillColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.rect(0, 12, pageW, 2, 'F');

  y = 22;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(JETA.navy.r, JETA.navy.g, JETA.navy.b);
  doc.text('JETA GROUPE', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
  doc.text('Plateforme de Suivi des Paiements  |  Siege social : Libreville, Gabon', margin, y + 6);

  y += 12;
  doc.setDrawColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);

  // --- TITRE + CODE PAIEMENT COLLÉ ---
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(JETA.navy.r, JETA.navy.g, JETA.navy.b);
  const fullTitle = `REÇU DE PAIEMENT  ${data.code_paiement || '—'}`;
  doc.text(fullTitle, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(JETA.slateLight.r, JETA.slateLight.g, JETA.slateLight.b);
  const receiptDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  doc.text(`Edité le ${receiptDate}`, pageW - margin, y, { align: 'right' });

  doc.setFillColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.roundedRect(margin - 3, y - 10, 2, 14, 0.5, 0.5, 'F');

  // --- CARTES PAYEUR / BENEFICIAIRE (HAUTEUR DYNAMIQUE) ---
  y += 12;
  const halfW = (contentW - 8) / 2;

  // Calcul hauteur bénéficiaire
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const maxNameW = halfW - 18;
  const splitName = doc.splitTextToSize(data.beneficiaire_nom, maxNameW);
  const nameHeight = splitName.length * 5;
  
  let infoH = 0;
  if (data.banque_nom) infoH += 4.5;
  if (data.rib) infoH += 4.5;
  if (!data.banque_nom && !data.rib) infoH += 4;
  
  const cardH = Math.max(28, 18 + nameHeight + infoH);

  // CARTE PAYEUR
  doc.setFillColor(JETA.grayBg.r, JETA.grayBg.g, JETA.grayBg.b);
  doc.roundedRect(margin, y, halfW, cardH, 3, 3, 'F');
  doc.setFillColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.roundedRect(margin, y, 2.5, cardH, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.text('PAYEUR', margin + 8, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(JETA.navy.r, JETA.navy.g, JETA.navy.b);
  doc.text(data.filiale_nom, margin + 8, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
  doc.text(`Code : ${data.filiale_code}`, margin + 8, y + 21);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(JETA.slateLight.r, JETA.slateLight.g, JETA.slateLight.b);
  doc.text('Filiale emettrice', margin + 8, y + cardH - 3);

  // CARTE BENEFICIAIRE
  const rx = margin + halfW + 8;
  doc.setFillColor(JETA.grayBg.r, JETA.grayBg.g, JETA.grayBg.b);
  doc.roundedRect(rx, y, halfW, cardH, 3, 3, 'F');
  doc.setFillColor(JETA.green.r, JETA.green.g, JETA.green.b);
  doc.roundedRect(rx, y, 2.5, cardH, 0.5, 0.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(JETA.greenDark.r, JETA.greenDark.g, JETA.greenDark.b);
  doc.text('BENEFICIAIRE', rx + 8, y + 6);
  doc.setFontSize(12);
  doc.setTextColor(JETA.navy.r, JETA.navy.g, JETA.navy.b);
  doc.text(splitName, rx + 8, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
  let subY = y + 14 + nameHeight + 2;
  if (data.banque_nom) {
    doc.text(`Banque : ${data.banque_nom}`, rx + 8, subY);
    subY += 4.5;
  }
  if (data.rib) {
    doc.text(`RIB : ${data.rib}`, rx + 8, subY);
    subY += 4.5;
  }
  if (!data.banque_nom && !data.rib) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(JETA.slateLight.r, JETA.slateLight.g, JETA.slateLight.b);
    doc.text('Beneficiaire du paiement', rx + 8, y + cardH - 3);
  }

  y += cardH + 8;

  // --- TABLEAU DÉTAILS (sans Code Paiement) ---
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    tableWidth: contentW,
    styles: { fontSize: 10, font: 'helvetica', cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 3 } },
    headStyles: {
      fillColor: rgb(JETA.blue),
      textColor: rgb(JETA.white),
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 10,
      textColor: rgb(JETA.navy),
    },
    alternateRowStyles: { fillColor: rgb(JETA.grayBg) },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: rgb(JETA.slate) },
      1: { cellWidth: 'auto' },
    },
    body: [
      [
        { content: 'Date de paiement', styles: { fontStyle: 'bold', textColor: rgb(JETA.slate) } },
        { content: formatDate(data.date_paiement) },
      ],
      [
        { content: 'Type de paiement', styles: { fontStyle: 'bold', textColor: rgb(JETA.slate) } },
        { content: data.type_paiement },
      ],
      [
        { content: 'Reference', styles: { fontStyle: 'bold', textColor: rgb(JETA.slate) } },
        { content: data.reference || '—' },
      ],
    ],
    theme: 'grid',
    tableLineColor: rgb(JETA.grayBorder),
    tableLineWidth: 0.3,
  });

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 8;

  // --- STATUT ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
  doc.text('STATUT :', margin, y);
  drawStatusBadge(doc, margin + 26, y - 1, data.statut);
  y += 10;

  // --- MONTANT TOTAL (2 lignes non encadrées) ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.text('MONTANT TOTAL', margin, y);
  y += 7;

  // Chiffres
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  const montantStr = formatCurrency(data.montant);
  let fs = 22;
  doc.setFontSize(fs);
  while (doc.getTextWidth(montantStr) > contentW && fs > 14) {
    fs--;
    doc.setFontSize(fs);
  }
  doc.text(montantStr, margin, y);
  y += 8;

  // Lettres
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
  const wordsStr = numberToWords(data.montant);
  const splitWords = doc.splitTextToSize(wordsStr, contentW);
  doc.text(splitWords, margin, y);
  y += splitWords.length * 4.5 + 6;

  // --- NOTES ---
  if (data.notes) {
    const notesBoxH = 18;
    doc.setFillColor(JETA.grayBg.r, JETA.grayBg.g, JETA.grayBg.b);
    doc.roundedRect(margin, y, contentW, notesBoxH, 3, 3, 'F');
    doc.setFillColor(JETA.amber.r, JETA.amber.g, JETA.amber.b);
    doc.roundedRect(margin, y, 2.5, notesBoxH, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(JETA.navy.r, JETA.navy.g, JETA.navy.b);
    doc.text('NOTES', margin + 8, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
    const splitNotes = doc.splitTextToSize(data.notes, contentW - 16);
    doc.text(splitNotes.slice(0, 2), margin + 8, y + 13);
    y += notesBoxH + 6;
  }

  // --- COORDONNÉES BANCAIRES ---
  if (data.banque_nom || data.rib) {
    const bankBoxH = data.rib ? 20 : 14;
    doc.setFillColor(JETA.grayBg.r, JETA.grayBg.g, JETA.grayBg.b);
    doc.roundedRect(margin, y, contentW, bankBoxH, 3, 3, 'F');
    doc.setFillColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
    doc.roundedRect(margin, y, 2.5, bankBoxH, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
    doc.text('COORDONNEES BANCAIRES', margin + 8, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(JETA.slate.r, JETA.slate.g, JETA.slate.b);
    if (data.banque_nom) doc.text(`Banque : ${data.banque_nom}`, margin + 8, y + 12);
    if (data.rib) {
      const ribF = `${data.rib.slice(0, 5)} ${data.rib.slice(5, 10)} ${data.rib.slice(10, 21)} ${data.rib.slice(21)}`;
      doc.text(`RIB : ${ribF}`, margin + 8, y + 17);
    }
    y += bankBoxH + 6;
  }

  // --- SIGNATURES ---
  const sigY = Math.max(y + 4, pageH - 32);
  doc.setDrawColor(JETA.grayBorder.r, JETA.grayBorder.g, JETA.grayBorder.b);
  doc.setLineWidth(0.5);

  const sigW = contentW / 2 - 14;
  doc.line(margin, sigY, margin + sigW, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(JETA.slateLight.r, JETA.slateLight.g, JETA.slateLight.b);
  doc.text('Signature du beneficiaire', margin, sigY + 6);
  doc.setFillColor(JETA.blue.r, JETA.blue.g, JETA.blue.b);
  doc.roundedRect(margin, sigY - 0.5, 2, 1.2, 0.3, 0.3, 'F');

  doc.setDrawColor(JETA.grayBorder.r, JETA.grayBorder.g, JETA.grayBorder.b);
  doc.line(pageW / 2 + 14, sigY, pageW - margin, sigY);
  doc.setFillColor(JETA.green.r, JETA.green.g, JETA.green.b);
  doc.roundedRect(pageW / 2 + 14, sigY - 0.5, 2, 1.2, 0.3, 0.3, 'F');
  doc.text('Cachet et signature', pageW / 2 + 14, sigY + 6);

  // --- FOOTER ---
  drawGradientRect(doc, 0, pageH - 6, pageW, 6, { r: 26, g: 26, b: 46 }, { r: 22, g: 33, b: 62 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(JETA.slateLight.r, JETA.slateLight.g, JETA.slateLight.b);
  doc.text('JETA GROUPE  ·  Plateforme de Suivi des Paiements v2.0.0', pageW / 2, pageH - 2.5, { align: 'center' });
  doc.text('Document genere automatiquement — ne pas modifier', margin, pageH - 2.5);
  doc.text(`Recu n° ${data.code_paiement || 'N/A'}`, pageW - margin, pageH - 2.5, { align: 'right' });

  const filename = `recu_${data.code_paiement || 'paiement'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface GrandLivreLine {
  date: string;
  libelle: string;
  code_facture?: string;
  code_paiement?: string;
  type_paiement?: string;
  banque_code?: string;
  code_lettrage?: string | null;
  chantier_nom?: string | null;
  notes?: string | null;
  type: 'facture' | 'paiement';
  debit: number;
  credit: number;
  solde: number;
  statut?: string;
  filiale?: Filiale | null;
}

export function generateGrandLivrePdf(fournisseurNom: string, entries: GrandLivreLine[]) {
  generateGrandLivrePdfSections(fournisseurNom, [{ title: '', entries }]);
}

export function generateGrandLivrePdfSections(fournisseurNom: string, sections: { title: string; entries: GrandLivreLine[] }[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageW = 210;
  const margin = 10;
  const contentW = pageW - 2 * margin;
  const hasMultiple = sections.length > 1;

  const drawHeader = (isFirst: boolean, subtitle: string) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 8, 'F');
    let y = 20;
    if (isFirst) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text('JETA GROUPE', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Plateforme de Suivi des Paiements — Grand Livre', margin, y);
      y += 5;
      doc.text('Siège social : Libreville, Gabon', margin, y);
      y += 9;
    }
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`Fournisseur : ${fournisseurNom}${subtitle ? ` — ${subtitle}` : ''}`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Édité le ${exportDate}`, pageW - margin, y, { align: 'right' });
    return y + 10;
  };

  const drawFooter = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 291, pageW, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text('JETA GROUPE - Plateforme de Suivi des Paiements', pageW / 2, 294, { align: 'center' });
    doc.text('Document généré automatiquement', margin, 294);
  };

  const pageFooter = () => {
    drawFooter();
  };

  let y = drawHeader(true, hasMultiple ? '' : '');

  const pageH = doc.internal.pageSize.height;

  for (const section of sections) {
    if (section.entries.length === 0) continue;

    const spaceForTitle = (hasMultiple && section.title) ? 15 : 0;
    if (y + spaceForTitle + 18 > pageH - 20) {
      doc.addPage();
      y = 20;
    }

    if (hasMultiple && section.title) {
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin - 2, y - 3, contentW + 4, 10, 2, 2, 'F');
      doc.setFillColor(30, 64, 175);
      doc.rect(margin - 2, y - 3, 2.5, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(section.title, margin + 5, y + 4);
      y += 12;
    }

    const totalDebit = section.entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = section.entries.reduce((s, e) => s + e.credit, 0);
    const finalSolde = section.entries.length > 0 ? section.entries[section.entries.length - 1].solde : 0;

    const colW = [14, 60, 14, 28, 28, 28, 18];
    const colX = colW.reduce((acc, w) => { acc.push(acc[acc.length-1] + w); return acc; }, [0]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 15 },
      tableWidth: contentW,
      styles: { fontSize: 8, font: 'helvetica', cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 3 } },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: colW[0], halign: 'center', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        1: { cellWidth: colW[1] },
        2: { cellWidth: colW[2], halign: 'center', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        3: { cellWidth: colW[3], halign: 'right' },
        4: { cellWidth: colW[4], halign: 'right' },
        5: { cellWidth: colW[5], halign: 'right' },
        6: { cellWidth: colW[6], cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
      },
      head: [['Date', 'Libellé', 'Lettrage', 'Débit', 'Crédit', 'Solde', 'Statut']],
      body: section.entries.map(e => {
        const code = e.type === 'facture' ? e.code_facture : e.code_paiement;
        const filialeNom = e.filiale?.nom || (e.type === 'facture' ? 'Facture' : 'Paiement');
        const libelleItem = [code, e.type_paiement, e.banque_code, e.chantier_nom, filialeNom, e.notes].filter(Boolean).join(' · ');
        return [
          formatDate(e.date),
          libelleItem,
          e.code_lettrage || '',
          e.debit !== 0 ? formatCurrency(e.debit) : '',
          e.credit !== 0 ? formatCurrency(e.credit) : '',
          formatCurrency(e.solde),
          e.type === 'facture' ? (e.statut || '') : '',
        ];
      }),
      theme: 'grid',
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.3,
      didDrawPage: pageFooter,
    });

    const fy = (doc as JsPDFWithAutoTable).lastAutoTable.finalY;
    const rowH = 8;
    let ty = fy + 1;

    if (ty + rowH > pageH - 15) {
      doc.addPage();
      ty = 20;
    }

    const cx = margin;
    doc.setFillColor(248, 250, 252);
    doc.rect(cx, ty, contentW, rowH, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.line(cx, ty, cx + contentW, ty);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('TOTAUX', cx + colX[3] - 1, ty + rowH / 2 + 1.5, { align: 'right' });
    doc.setTextColor(finalSolde > 0 ? 220 : 22, finalSolde > 0 ? 38 : 163, finalSolde > 0 ? 38 : 74);
    doc.text(formatCurrency(finalSolde), cx + (colX[5] + colX[6]) / 2, ty + rowH / 2 + 1.5, { align: 'center' });
    doc.setTextColor(15, 23, 42);
    if (totalDebit > 0) doc.text(formatCurrency(totalDebit), cx + (colX[3] + colX[4]) / 2, ty + rowH / 2 + 1.5, { align: 'center' });
    if (totalCredit > 0) doc.text(formatCurrency(totalCredit), cx + (colX[4] + colX[5]) / 2, ty + rowH / 2 + 1.5, { align: 'center' });
    doc.setDrawColor(229, 231, 235);
    doc.line(cx, ty + rowH, cx + contentW, ty + rowH);
    y = ty + rowH + 8;
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 291, pageW, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text('JETA GROUPE - Plateforme de Suivi des Paiements', pageW / 2, 294, { align: 'center' });
    doc.text('Document généré automatiquement', margin, 294);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, 294, { align: 'right' });
  }

  const filename = `grand_livre_${fournisseurNom.replace(/[/\\?%*:|"<>\s]/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export interface PaiementReportRow {
  id: string;
  date_paiement: string;
  code_paiement?: string | null;
  filiale: { nom: string; code?: string | null } | null;
  banque?: string | null;
  fournisseur: { nom: string } | null;
  filiale_receptrice?: { nom: string } | null;
  type_paiement: string;
  montant: number;
  reference?: string | null;
  statut: string;
  notes?: string | null;
}

export function generatePaiementsPeriodPdf(paiements: PaiementReportRow[], dateFrom: string, dateTo: string) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageW = 297;
  const margin = 10;
  const contentW = pageW - 2 * margin;
  const pageH = doc.internal.pageSize.height;

  const rows = [...paiements].sort((a, b) => a.date_paiement.localeCompare(b.date_paiement));

  const totalMontant = rows.reduce((s, p) => s + p.montant, 0);
  const totalCash = rows.filter((p) => p.type_paiement === 'Cash').reduce((s, p) => s + p.montant, 0);
  const totalBanque = totalMontant - totalCash;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 8, 'F');

  let y = 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text('JETA GROUPE', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Plateforme de Suivi des Paiements — Rapport des paiements', margin, y);
  y += 5;
  doc.text('Siège social : Libreville, Gabon', margin, y);
  y += 6;

  let periode = 'Toutes les périodes';
  if (dateFrom && dateTo) {
    periode = dateFrom === dateTo
      ? `Journée du ${formatDate(dateFrom)}`
      : `Du ${formatDate(dateFrom)} au ${formatDate(dateTo)}`;
  } else if (dateFrom) {
    periode = `À partir du ${formatDate(dateFrom)}`;
  } else if (dateTo) {
    periode = `Jusqu'au ${formatDate(dateTo)}`;
  }

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(periode, margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const exportDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Édité le ${exportDate}`, pageW - margin, y, { align: 'right' });
  y += 8;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F');
  doc.setFillColor(30, 64, 175);
  doc.rect(margin, y, 2.5, 16, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nombre de paiements : ${rows.length}`, margin + 6, y + 5);
  doc.text(`Total payé : ${formatCurrency(totalMontant)}`, margin + 6, y + 12);
  doc.text(`Cash : ${formatCurrency(totalCash)}`, pageW / 2, y + 5);
  doc.text(`Banque : ${formatCurrency(totalBanque)}`, pageW / 2, y + 12);
  y += 20;

  const drawFooter = () => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageH - 6, pageW, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text('JETA GROUPE - Plateforme de Suivi des Paiements', pageW / 2, pageH - 3, { align: 'center' });
    doc.text('Document généré automatiquement', margin, pageH - 3);
  };

  const colW = [18, 34, 40, 40, 48, 30, 28, 20, 19];
  const colX = colW.reduce((acc, w) => { acc.push(acc[acc.length - 1] + w); return acc; }, [0]);

  if (rows.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 15 },
      tableWidth: contentW,
      styles: { fontSize: 8, font: 'helvetica', cellPadding: { top: 1.5, right: 3, bottom: 1.5, left: 3 } },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: colW[0], halign: 'center', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        1: { cellWidth: colW[1], cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        2: { cellWidth: colW[2] },
        3: { cellWidth: colW[3] },
        4: { cellWidth: colW[4] },
        5: { cellWidth: colW[5], halign: 'center' },
        6: { cellWidth: colW[6], halign: 'center', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        7: { cellWidth: colW[7], halign: 'center', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
        8: { cellWidth: colW[8], halign: 'right', cellPadding: { top: 1.5, right: 1, bottom: 1.5, left: 1 } },
      },
      head: [['Date', 'Code', 'Filiale', 'Banque', 'Fournisseur', 'Type', 'Réf.', 'Statut', 'Montant']],
      body: rows.map((p) => [
        formatDate(p.date_paiement),
        p.code_paiement || '—',
        p.filiale?.nom || '—',
        p.banque || '—',
        p.fournisseur ? p.fournisseur.nom : (p.filiale_receptrice ? p.filiale_receptrice.nom : 'Interne'),
        p.type_paiement,
        p.reference || '—',
        p.statut || '',
        formatCurrency(p.montant),
      ]),
      theme: 'grid',
      tableLineColor: [229, 231, 235],
      tableLineWidth: 0.3,
      didDrawPage: drawFooter,
    });

    const fy = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    const rowH = 8;
    let ty = fy + 2;

    if (ty + rowH > pageH - 15) {
      doc.addPage();
      ty = 20;
    }

    const cx = margin;
    doc.setFillColor(30, 64, 175);
    doc.rect(cx, ty, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL', cx + colX[8] - 15, ty + rowH / 2 + 1.5, { align: 'right' });
    doc.text(formatCurrency(totalMontant), cx + colX[8] + colW[8] - 1.5, ty + rowH / 2 + 1.5, { align: 'right' });
    y = ty + rowH;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Aucun paiement sur la période sélectionnée.', pageW / 2, y + 10, { align: 'center' });
  }

  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageH - 6, pageW, 6, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(156, 163, 175);
    doc.text('JETA GROUPE - Plateforme de Suivi des Paiements', pageW / 2, pageH - 3, { align: 'center' });
    doc.text('Document généré automatiquement', margin, pageH - 3);
    doc.text(`Page ${i}/${totalPages}`, pageW - margin, pageH - 3, { align: 'right' });
  }

  const slug = [dateFrom || 'toutes', dateTo || ''].filter(Boolean).join('_').replace(/[/\\?%*:|"<>\s]/g, '_');
  const filename = `rapport_paiements_${slug || 'toutes'}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}