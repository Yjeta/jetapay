import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';
import { generateCodePaiement } from '../lib/utils';
import { X, Upload, Loader2, FileSpreadsheet, AlertTriangle, CheckCircle, ClipboardCheck, Download, Search } from 'lucide-react';

interface CSVRow {
  code_paiement: string;
  date_paiement: string;
  filiale: string;
  fournisseur: string;
  montant: string;
  type_paiement: string;
  statut: string;
  banque: string;
  numero_compte: string;
  beneficiaire: string;
  reference: string;
  notes: string;
}

interface RowValidation {
  row: number;
  message: string;
}

interface ValidatedRow {
  code_paiement: string;
  date_paiement: string;
  filiale_id: string;
  fournisseur_id: string | null;
  montant: number;
  type_paiement: string;
  statut: string;
  compte_bancaire_id: string | null;
  beneficiaire_id: string | null;
  reference: string | null;
  notes: string | null;
}

interface FournisseurBrief {
  id: string;
  nom: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('Fichier vide ou sans données');
  const headers = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((l) => l.split(';').map((c) => c.trim()));
  return { headers, rows };
}

function rowToObject(headers: string[], values: string[]): CSVRow {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = values[i] || ''; });
  return obj as unknown as CSVRow;
}

function bigramSimilarity(a: string, b: string): number {
  const aBigrams = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) aBigrams.add(a.slice(i, i + 2));
  let common = 0;
  for (let i = 0; i < b.length - 1; i++) if (aBigrams.has(b.slice(i, i + 2))) common++;
  return aBigrams.size + b.length - 1 > 0 ? (2 * common) / (aBigrams.size + b.length - 1) : 0;
}

function suggestFournisseurs(list: FournisseurBrief[], query: string, max: number): FournisseurBrief[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const qWords = q.split(/\s+/).filter(Boolean);
  return list
    .map((f) => {
      const name = f.nom.toLowerCase();
      if (name === q) return { f, score: 1000 };
      if (name === q.replace(/s$/, '') || q === name.replace(/s$/, '')) return { f, score: 950 };

      const nameWords = name.split(/\s+/).filter(Boolean);
      let totalScore = 0;
      const commonWords = qWords.filter((w) => nameWords.includes(w)).length;
      totalScore += commonWords * 200;

      for (const qw of qWords) {
        let bestWordScore = 0;
        for (const nw of nameWords) {
          if (nw === qw) { bestWordScore = Math.max(bestWordScore, 200); continue; }
          if (nw.startsWith(qw) || qw.startsWith(nw)) { bestWordScore = Math.max(bestWordScore, 150); continue; }
          if (nw.includes(qw) || qw.includes(nw)) { bestWordScore = Math.max(bestWordScore, 100); continue; }
          const dice = bigramSimilarity(qw, nw);
          if (dice > 0.4) bestWordScore = Math.max(bestWordScore, Math.round(dice * 80));
        }
        totalScore += bestWordScore;
      }

      const fullOverlap = bigramSimilarity(q, name);
      if (fullOverlap > 0.5) totalScore = Math.max(totalScore, Math.round(fullOverlap * 300));

      if (totalScore < 30) return null;
      return { f, score: totalScore - name.length * 0.5 };
    })
    .filter((x): x is { f: FournisseurBrief; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.f);
}

const typesValides = ['Cash', 'Chèque', 'Virement', 'Traite', 'Mise à disposition', 'Opération bancaire'];
const statutsValides = ['Validé', 'En attente', 'Rejeté', 'Annulé'];

export function ImportPaiementsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fournisseurs, setFournisseurs] = useState<FournisseurBrief[]>([]);
  const [parsedRows, setParsedRows] = useState<CSVRow[]>([]);
  const [editableRows, setEditableRows] = useState<CSVRow[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<RowValidation[] | null>(null);
  const [validatedData, setValidatedData] = useState<ValidatedRow[] | null>(null);
  const [importErrors, setImportErrors] = useState<RowValidation[] | null>(null);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [frsDropdown, setFrsDropdown] = useState<Record<number, boolean>>({});
  const [cachedData, setCachedData] = useState<{
    filiales: { id: string; nom: string; code: string }[];
    fournisseurs: { id: string; nom: string }[];
    banques: { id: string; nom: string }[];
    comptes: { id: string; numero_compte: string; banque_nom: string }[];
    beneficiaires: { id: string; nom: string }[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('fournisseurs').select('id, nom').order('nom'),
      supabase.from('filiales').select('id, nom, code'),
      supabase.from('banques').select('id, nom'),
      supabase.from('comptes_bancaires').select('id, numero_compte, banque:banques(nom)'),
      supabase.from('beneficiaires').select('id, nom'),
    ]).then(([frsRes, filRes, banRes, cptRes, benRes]) => {
      if (frsRes.data) setFournisseurs(frsRes.data);
      setCachedData({
        filiales: filRes.data || [],
        fournisseurs: frsRes.data || [],
        banques: banRes.data || [],
        comptes: (cptRes.data || []).map((c: { id: string; numero_compte: string; banque: { nom: string }[] | { nom: string } | null }) => ({
          id: c.id,
          numero_compte: c.numero_compte,
          banque_nom: (Array.isArray(c.banque) ? c.banque[0]?.nom : c.banque?.nom)?.toLowerCase() || '',
        })),
        beneficiaires: benRes.data || [],
      });
    });
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let headers: string[];
      let rows: string[][];
      if (file.name.endsWith('.xlsx')) {
        const { read, utils } = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: (string | number | boolean | Date | null)[][] = utils.sheet_to_json(ws, { header: 1 });
        headers = data[0].map((h) => String(h ?? '').trim().toLowerCase());
        rows = data.slice(1)
          .filter((r) => r.some((c) => c !== undefined && c !== null && String(c).trim() !== ''))
          .map((r) => headers.map((_, i) => {
            const val = r[i];
            if (val === undefined || val === null) return '';
            const s = String(val).trim();
            if (/^-?\d+(\.\d+)?$/.test(s) && !isNaN(Number(s))) {
              const num = Number(s);
              if (num > 40000 && num < 250000) {
                const d = new Date((num - 25569) * 86400000);
                if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
              }
            }
            return s;
          }));
      } else {
        const text = await file.text();
        const parsed = parseCSV(text);
        headers = parsed.headers;
        rows = parsed.rows;
      }
      const required = ['date_paiement', 'filiale', 'fournisseur', 'montant', 'type_paiement', 'statut'];
      const missing = required.filter((r) => !headers.includes(r));
      if (missing.length > 0) {
        toast.error(`Colonnes manquantes : ${missing.join(', ')}`);
        return;
      }
      const parsed = rows.map((r) => rowToObject(headers, r));
      setParsedRows(parsed);
      setEditableRows(parsed.map((r) => ({ ...r })));
      setValidationErrors(null);
      setValidatedData(null);
      setImportErrors(null);
      setImportSuccess(null);
      setFrsDropdown({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de lecture du fichier');
    }
  };

  const updateRow = (index: number, field: keyof CSVRow, value: string) => {
    setEditableRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleValidate = async () => {
    setValidating(true);
    setValidationErrors(null);
    setValidatedData(null);
    setImportErrors(null);
    setImportSuccess(null);
    setFrsDropdown({});

    const cache = cachedData;
    if (!cache) { toast.error('Données de référence pas encore chargées'); setValidating(false); return; }

    const errors: RowValidation[] = [];
    const valid: ValidatedRow[] = [];

    const filialeMap = new Map(cache.filiales.map((f) => [f.nom.toLowerCase(), f.id]));
    const filialeCodeMap = new Map(cache.filiales.map((f) => [f.nom.toLowerCase(), f.code]));
    const frsMap = new Map(cache.fournisseurs.map((f) => [f.nom.toLowerCase(), f.id]));
    const benefMap = new Map(cache.beneficiaires.map((b) => [b.nom.toLowerCase(), b.id]));
    const compteByBanque = new Map<string, string[]>();
    const compteByNumero = new Map(cache.comptes.map((c) => [c.numero_compte, c.id]));
    for (const c of cache.comptes) {
      const arr = compteByBanque.get(c.banque_nom) || [];
      arr.push(c.id);
      compteByBanque.set(c.banque_nom, arr);
    }

    for (let i = 0; i < editableRows.length; i++) {
      const r = editableRows[i];
      const rowNum = i + 1;

      const code_paiement = r.code_paiement || await generateCodePaiement(filialeCodeMap.get(r.filiale.trim().toLowerCase()));
      if (!r.date_paiement) { errors.push({ row: rowNum, message: 'Date paiement manquante' }); continue; }

      const montant = parseFloat(r.montant.replace(/\s/g, '').replace(',', '.'));
      if (isNaN(montant)) { errors.push({ row: rowNum, message: `Montant invalide : "${r.montant}"` }); continue; }

      if (!typesValides.includes(r.type_paiement)) { errors.push({ row: rowNum, message: `Type invalide : "${r.type_paiement}"` }); continue; }
      if (!statutsValides.includes(r.statut)) { errors.push({ row: rowNum, message: `Statut invalide : "${r.statut}"` }); continue; }

      if (!r.filiale) { errors.push({ row: rowNum, message: 'Filiale manquante' }); continue; }
      const filialeId = filialeMap.get(r.filiale.trim().toLowerCase());
      if (!filialeId) { errors.push({ row: rowNum, message: `Filiale introuvable : "${r.filiale}"` }); continue; }

      let fournisseur_id: string | null = null;
      if (r.fournisseur) {
        const frsId = frsMap.get(r.fournisseur.trim().toLowerCase());
        if (!frsId) { errors.push({ row: rowNum, message: `Fournisseur introuvable : "${r.fournisseur}"` }); continue; }
        fournisseur_id = frsId;
      }

      let compte_bancaire_id: string | null = null;
      if (r.type_paiement !== 'Cash' && r.banque) {
        const banqueNorm = r.banque.trim().toLowerCase();
        if (r.numero_compte) {
          const cptId = compteByNumero.get(r.numero_compte.trim());
          if (cptId) {
            compte_bancaire_id = cptId;
          } else {
            const ids = compteByBanque.get(banqueNorm);
            if (ids && ids.length > 0) {
              compte_bancaire_id = ids[0];
            } else {
              errors.push({ row: rowNum, message: `Compte bancaire introuvable pour banque "${r.banque}" / n° "${r.numero_compte}"` });
              continue;
            }
          }
        } else {
          const ids = compteByBanque.get(banqueNorm);
          if (ids && ids.length > 0) {
            compte_bancaire_id = ids[0];
          } else {
            errors.push({ row: rowNum, message: `Banque introuvable : "${r.banque}"` });
            continue;
          }
        }
      } else if (r.type_paiement !== 'Cash' && !r.banque) {
        errors.push({ row: rowNum, message: 'Banque requise pour ce type de paiement' });
        continue;
      }

      let beneficiaire_id: string | null = null;
      if (r.beneficiaire) {
        const bId = benefMap.get(r.beneficiaire.trim().toLowerCase());
        if (!bId) { errors.push({ row: rowNum, message: `Bénéficiaire introuvable : "${r.beneficiaire}"` }); continue; }
        beneficiaire_id = bId;
      }

      valid.push({
        code_paiement,
        date_paiement: r.date_paiement,
        filiale_id: filialeId,
        fournisseur_id,
        montant,
        type_paiement: r.type_paiement,
        statut: r.statut,
        compte_bancaire_id,
        beneficiaire_id,
        reference: r.reference || null,
        notes: r.notes || null,
      });
    }

    setValidationErrors(errors);
    setValidatedData(errors.length === 0 ? valid : null);
    setValidating(false);

    if (errors.length === 0) {
      toast.success(`${valid.length} ligne(s) valides, prêtes à importer`);
    } else {
      const errRows = new Set(errors.map((e) => e.row));
      const errMsgs: Record<number, string[]> = {};
      errors.forEach((e) => { (errMsgs[e.row] = errMsgs[e.row] || []).push(e.message); });
      errRows.forEach((row) => {
        const r = editableRows[row - 1];
        if (r && errMsgs[row]?.some((m) => m.includes('Fournisseur introuvable'))) {
          suggestFournisseurs(cache.fournisseurs, r.fournisseur, 5);
        }
      });
    }
  };

  const handleExecuteImport = async () => {
    if (!validatedData || validatedData.length === 0) return;
    setImporting(true);
    setImportErrors(null);
    setImportSuccess(null);

    const { error } = await supabase.from('paiements').insert(validatedData);
    if (error) {
      setImportErrors([{ row: 0, message: error.message }]);
      setImportSuccess(0);
    } else {
      setImportSuccess(validatedData.length);
      toast.success(`${validatedData.length} paiement(s) importé(s) avec succès`);
      onImported();
    }
    setImporting(false);
  };

  const errorRowSet = validationErrors ? new Set(validationErrors.map((e) => e.row)) : new Set<number>();
  const errorMsgs: Record<number, string[]> = {};
  validationErrors?.forEach((e) => { (errorMsgs[e.row] = errorMsgs[e.row] || []).push(e.message); });

  const phase = importSuccess !== null ? 'result' : validationErrors !== null || validatedData !== null ? 'review' : 'upload';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Import des paiements</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {phase === 'upload' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Format attendu (CSV .csv ou Excel .xlsx)</p>
                <p className="text-blue-600 mb-2">
                  Colonnes : <code className="text-xs">date_paiement;filiale;fournisseur;montant;type_paiement;statut</code>
                  (code_paiement optionnel, banque/numero_compte/beneficiaire/reference/notes optionnels)
                </p>
                <p className="text-blue-600">
                  <strong>code_paiement</strong> est optionnel — s'il est vide, un code unique est généré automatiquement.<br />
                  Pour un paiement en Cash, laisser <strong>banque</strong> et <strong>numero_compte</strong> vides.
                  Les noms de filiale, fournisseur, banque et bénéficiaire doivent correspondre exactement à ceux en base.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/gabarit_import_paiements.xlsx';
                    link.download = 'gabarit_import_paiements.xlsx';
                    link.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger le gabarit Excel
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,.xlsx"
                  onChange={handleFile}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              {parsedRows.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 border-b border-gray-200">
                    {parsedRows.length} ligne(s) détectée(s)
                  </div>
                  <div className="overflow-x-auto max-h-60 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {['Code', 'Date', 'Filiale', 'Fournisseur', 'Montant', 'Type', 'Statut'].map((h) => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedRows.slice(0, 50).map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono">{r.code_paiement}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{r.date_paiement}</td>
                            <td className="px-3 py-2">{r.filiale}</td>
                            <td className="px-3 py-2">{r.fournisseur}</td>
                            <td className="px-3 py-2 text-right">{r.montant}</td>
                            <td className="px-3 py-2">{r.type_paiement}</td>
                            <td className="px-3 py-2">{r.statut}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || validating}
                  onClick={handleValidate}
                  className="btn-primary flex-1"
                >
                  {validating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <ClipboardCheck className="w-4 h-4" />
                  Vérifier
                </button>
              </div>
            </>
          )}

          {phase === 'review' && (
            <>
              {validationErrors && validationErrors.length > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{validationErrors.length} erreur(s) — corrigez directement dans le tableau ci-dessous</span>
                </div>
              )}
              {validationErrors?.length === 0 && validatedData && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">{validatedData.length} ligne(s) valides</p>
                    <p className="text-sm text-emerald-600">Aucune erreur détectée, vous pouvez importer.</p>
                  </div>
                </div>
              )}

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-600 border-b border-gray-200">
                  Données à importer
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500 w-8">#</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Date</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Filiale</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Fournisseur</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Montant</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Type</th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-500">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editableRows.map((r, i) => {
                        const rowNum = i + 1;
                        const hasErrors = errorRowSet.has(rowNum);
                        const msgs = errorMsgs[rowNum] || [];
                        const frsError = msgs.find((m) => m.includes('Fournisseur introuvable'));
                        return (
                          <tr key={i} className={`${hasErrors ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                            <td className={`px-3 py-2 font-mono ${hasErrors ? 'text-red-600' : 'text-gray-400'}`}>{(i + 1)}</td>
                            <td className="px-3 py-1">
                              <input
                                type="date"
                                value={r.date_paiement}
                                onChange={(e) => updateRow(i, 'date_paiement', e.target.value)}
                                className={`w-full px-2 py-1 border rounded text-xs ${hasErrors ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              />
                            </td>
                            <td className="px-3 py-1">
                              <input
                                type="text"
                                value={r.filiale}
                                onChange={(e) => updateRow(i, 'filiale', e.target.value)}
                                className={`w-full px-2 py-1 border rounded text-xs ${hasErrors && msgs.some((m) => m.includes('Filiale')) ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              />
                            </td>
                            <td className="px-3 py-1 relative">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={r.fournisseur}
                                  onChange={(e) => {
                                    updateRow(i, 'fournisseur', e.target.value);
                                    setFrsDropdown((prev) => ({ ...prev, [rowNum]: true }));
                                  }}
                                  onFocus={() => setFrsDropdown((prev) => ({ ...prev, [rowNum]: true }))}
                                  onBlur={() => setTimeout(() => setFrsDropdown((prev) => ({ ...prev, [rowNum]: false })), 200)}
                                  className={`w-full px-2 py-1 border rounded text-xs ${frsError ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                                  placeholder="Nom du fournisseur"
                                />
                                {frsDropdown[rowNum] && r.fournisseur && (
                                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                    {(() => {
                                      const suggestions = suggestFournisseurs(fournisseurs, r.fournisseur, 8);
                                      if (suggestions.length === 0) {
                                        return <div className="px-3 py-2 text-xs text-gray-400">Aucun fournisseur trouvé</div>;
                                      }
                                      return suggestions.map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onMouseDown={() => updateRow(i, 'fournisseur', f.nom)}
                                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                        >
                                          {f.nom}
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                )}
                              </div>
                              {frsError && (
                                <div className="mt-1 space-y-1">
                                  <p className="text-[10px] text-red-500">{frsError}</p>
                                  {(() => {
                                    const suggestions = suggestFournisseurs(fournisseurs, r.fournisseur, 5);
                                    if (suggestions.length > 0) {
                                      return (
                                        <div className="flex flex-wrap gap-1">
                                          {suggestions.map((f) => (
                                            <button
                                              key={f.id}
                                              type="button"
                                              onMouseDown={() => updateRow(i, 'fournisseur', f.nom)}
                                              className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                                            >
                                              {f.nom}
                                            </button>
                                          ))}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-1">
                              <input
                                type="text"
                                value={r.montant}
                                onChange={(e) => updateRow(i, 'montant', e.target.value)}
                                className={`w-full px-2 py-1 border rounded text-xs text-right ${hasErrors && msgs.some((m) => m.includes('Montant')) ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              />
                            </td>
                            <td className="px-3 py-1">
                              <select
                                value={r.type_paiement}
                                onChange={(e) => updateRow(i, 'type_paiement', e.target.value)}
                                className={`w-full px-2 py-1 border rounded text-xs ${hasErrors && msgs.some((m) => m.includes('Type')) ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              >
                                {typesValides.map((t) => <option key={t} value={t}>{t}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-1">
                              <select
                                value={r.statut}
                                onChange={(e) => updateRow(i, 'statut', e.target.value)}
                                className={`w-full px-2 py-1 border rounded text-xs ${hasErrors && msgs.some((m) => m.includes('Statut')) ? 'border-red-300 bg-red-100' : 'border-gray-200'} focus:outline-none focus:ring-1 focus:ring-blue-400`}
                              >
                                {statutsValides.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => { setValidationErrors(null); setValidatedData(null); setParsedRows([]); setEditableRows([]); }} className="btn-secondary flex-1">
                  Changer de fichier
                </button>
                <button
                  type="button"
                  disabled={importing}
                  onClick={handleValidate}
                  className="btn-secondary"
                >
                  {validating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Search className="w-4 h-4" />
                  Re-vérifier
                </button>
                <button
                  type="button"
                  disabled={!validatedData || validatedData.length === 0 || importing}
                  onClick={handleExecuteImport}
                  className="btn-primary flex-1"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Upload className="w-4 h-4" />
                  Importer {validatedData && validationErrors?.length === 0 ? `(${validatedData.length})` : ''}
                </button>
              </div>
            </>
          )}

          {phase === 'result' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">{importSuccess} paiement(s) importé(s)</p>
                </div>
              </div>

              {importErrors && importErrors.length > 0 && (
                <div className="border border-red-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 border-b border-red-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {importErrors.length} échec(s) lors de l'insertion
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-red-500">Ligne</th>
                          <th className="text-left px-3 py-2 font-semibold text-red-500">Erreur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {importErrors.map((e, i) => (
                          <tr key={i} className="hover:bg-red-50">
                            <td className="px-3 py-2 font-mono text-red-700">{e.row}</td>
                            <td className="px-3 py-2 text-red-600">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button type="button" onClick={onClose} className="btn-primary w-full">Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
