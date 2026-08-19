import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useFournisseurs, useChantiers } from '../hooks/useData';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate, generateCodeLettrage } from '../lib/utils';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertTriangle, Ban, X, Loader2, BookOpen, ChevronRight, Unlink, Search, Download } from 'lucide-react';
import type { Facture, Filiale, Paiement, CompteBancaire, Banque } from '../types';
import type { GrandLivreLine } from '../lib/generateReceipt';
import { useAuth } from '../context/AuthContext';

interface PaiementWithFiliale {
  id: string;
  code_paiement: string;
  date_paiement: string;
  montant: number;
  type_paiement: string;
  reference: string | null;
  statut: string;
  filiale: Filiale | null;
}

interface PaiementFactureLink {
  id: string;
  facture_id: string;
  montant: number | null;
  code_lettrage: string | null;
  paiement: PaiementWithFiliale;
}

type FactureWithLinks = Facture & {
  filiale: Filiale | null;
  paiement_factures: PaiementFactureLink[];
};

type PaiementLivre = Paiement & {
  filiale: Filiale;
  compte_bancaire: (CompteBancaire & { banque: Banque }) | null;
  paiement_factures: PaiementFactureLink[] | null;
};

type Ecriture = {
  id: string;
  date: string;
  libelle: string;
  type: 'facture' | 'paiement';
  debit: number;
  credit: number;
  solde: number;
  statut?: string;
  lettre?: boolean;
  date_lettrage?: string | null;
  code_facture?: string;
  code_paiement?: string;
  type_paiement?: string;
  banque_code?: string;
  notes?: string | null;
  chantier_id?: string | null;
  filiale?: Filiale | null;
  paiement_factures?: PaiementFactureLink[];
};

async function fetchAllPaged<T>(query: { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }> }, pageSize = 1000): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

const statutBadgeStyles: Record<string, string> = {
  'Impayée': 'badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200',
  'Partiellement payée': 'badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200',
  'Payée': 'badge bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200',
  'Annulée': 'badge bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200',
};

export function GrandLivrePage() {
  const { fournisseurId } = useParams<{ fournisseurId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPerm } = useAuth();
  const { data: allFournisseurs, refresh: refreshFournisseurs } = useFournisseurs();
  const { data: allChantiers, refresh: refreshChantiers } = useChantiers();
  const fournisseur = allFournisseurs.find((f) => f.id === fournisseurId);

  const [searchFournisseur, setSearchFournisseur] = useState('');
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [ecritures, setEcritures] = useState<Ecriture[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [chantierFilter, setChantierFilter] = useState('');
  const [groupByProjet, setGroupByProjet] = useState(false);
  const [expandedChantiers, setExpandedChantiers] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lettrant, setLettrant] = useState(false);
  const [delettrant, setDelettrant] = useState(false);
  const [showGeneral, setShowGeneral] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(false);
  const [generalData, setGeneralData] = useState<Map<string, Ecriture[]>>(new Map());
  const [expandedFournisseurs, setExpandedFournisseurs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!fournisseurId) return;
    loadData();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fournisseurId]);

  const loadData = useCallback(async (background?: boolean) => {
    if (!background) setLoading(true);
    setQueryError(null);

    try {
      const facturesQuery = supabase
        .from('factures')
        .select('*, filiale:filiales(*), paiement_factures!facture_id(*, paiement:paiements!paiement_id(*, filiale:filiales!filiale_id(*)))')
        .eq('fournisseur_id', fournisseurId);

      const paiementsQuery = supabase
        .from('paiements')
        .select('*, filiale:filiales!filiale_id(*), paiement_factures!paiement_id(*), compte_bancaire:comptes_bancaires(*, banque:banques(*))')
        .eq('fournisseur_id', fournisseurId)
        .order('date_paiement', { ascending: true });

      const [factures, paiements] = await Promise.all([
        fetchAllPaged<FactureWithLinks>(facturesQuery),
        fetchAllPaged<PaiementLivre>(paiementsQuery),
      ]);

      const rows: Ecriture[] = [];

      for (const f of factures || []) {
        rows.push({
          id: f.id,
          date: f.date_facture,
          libelle: `${f.code_facture}` + (f.filiale ? ` - ${f.filiale.nom}` : ''),
          type: 'facture',
          debit: 0,
          credit: f.montant,
          solde: 0,
          statut: f.statut,
          lettre: f.lettre,
          date_lettrage: f.date_lettrage,
          code_facture: f.code_facture,
          notes: f.notes,
          chantier_id: f.chantier_id,
          filiale: f.filiale,
          paiement_factures: f.paiement_factures,
        });
      }

      for (const p of (paiements || []).filter((p) => !p.deleted_at)) {
        const banqueCode = p.compte_bancaire?.banque?.code;
        rows.push({
          id: p.id,
          date: p.date_paiement,
          libelle: `${p.code_paiement}` + (p.filiale ? ` - ${p.filiale.nom}` : '') + (banqueCode ? ` - ${banqueCode}` : ''),
          type: 'paiement',
          debit: p.montant,
          credit: 0,
          solde: 0,
          code_paiement: p.code_paiement,
          type_paiement: p.type_paiement,
          banque_code: p.compte_bancaire?.banque?.code || undefined,
          notes: p.notes,
          filiale: p.filiale,
          paiement_factures: p.paiement_factures ?? [],
        });
      }

      rows.sort((a, b) => a.date.localeCompare(b.date));

      let running = 0;
      for (const r of rows) {
        running += r.credit - r.debit;
        r.solde = running;
      }

      setEcritures(rows);
      setLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setQueryError(message);
      toast.error('Erreur lors du chargement: ' + message);
      setLoading(false);
    }
  }, [fournisseurId, toast]);

  const reload = useCallback(() => {
    refreshChantiers();
    refreshFournisseurs();
    if (fournisseurId) loadData(true);
  }, [fournisseurId, loadData, refreshChantiers, refreshFournisseurs]);

  useEffect(() => {
    const interval = setInterval(reload, 15000);
    const onFacturesUpdated = () => reload();
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('factures-updated', onFacturesUpdated);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('factures-updated', onFacturesUpdated);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const loadGeneralData = async () => {
    setGeneralLoading(true);
    setQueryError(null);

    try {
      const facturesQuery = supabase
        .from('factures')
        .select('*, filiale:filiales(*), paiement_factures!facture_id(*)')
        .order('date_facture', { ascending: true });

      const paiementsQuery = supabase
        .from('paiements')
        .select('*, filiale:filiales!filiale_id(*), compte_bancaire:comptes_bancaires(*, banque:banques(*))')
        .order('date_paiement', { ascending: true });

      const [factures, paiements] = await Promise.all([
        fetchAllPaged<FactureWithLinks>(facturesQuery),
        fetchAllPaged<PaiementLivre>(paiementsQuery),
      ]);

      const facturesByFrs = new Map<string, Ecriture[]>();
      const paiementsByFrs = new Map<string, Ecriture[]>();

      for (const f of factures || []) {
        const frsId = f.fournisseur_id;
        if (!frsId) continue;
        if (!facturesByFrs.has(frsId)) facturesByFrs.set(frsId, []);
        facturesByFrs.get(frsId)!.push({
          id: f.id,
          date: f.date_facture,
          libelle: `${f.code_facture}` + (f.filiale ? ` - ${f.filiale.nom}` : ''),
          type: 'facture',
          debit: 0,
          credit: f.montant,
          solde: 0,
          statut: f.statut,
          lettre: f.lettre,
          date_lettrage: f.date_lettrage,
          code_facture: f.code_facture,
          notes: f.notes,
          chantier_id: f.chantier_id,
          filiale: f.filiale,
          paiement_factures: f.paiement_factures,
        });
      }

      for (const p of (paiements || []).filter((p) => !p.deleted_at)) {
        const frsId = p.fournisseur_id;
        if (!frsId) continue;
        if (!paiementsByFrs.has(frsId)) paiementsByFrs.set(frsId, []);
        const banqueCode = p.compte_bancaire?.banque?.code;
        paiementsByFrs.get(frsId)!.push({
          id: p.id,
          date: p.date_paiement,
          libelle: `${p.code_paiement}` + (p.filiale ? ` - ${p.filiale.nom}` : '') + (banqueCode ? ` - ${banqueCode}` : ''),
          type: 'paiement',
          debit: p.montant,
          credit: 0,
          solde: 0,
          code_paiement: p.code_paiement,
          type_paiement: p.type_paiement,
          banque_code: p.compte_bancaire?.banque?.code || undefined,
          notes: p.notes,
          filiale: p.filiale,
          paiement_factures: [],
        });
      }

      const allFrsIds = new Set([...facturesByFrs.keys(), ...paiementsByFrs.keys()]);
      const grouped = new Map<string, Ecriture[]>();

      for (const frsId of allFrsIds) {
        const rows = [
          ...(facturesByFrs.get(frsId) || []),
          ...(paiementsByFrs.get(frsId) || []),
        ];
        rows.sort((a, b) => a.date.localeCompare(b.date));
        let running = 0;
        for (const r of rows) {
          running += r.credit - r.debit;
          r.solde = running;
        }
        grouped.set(frsId, rows);
      }

      setGeneralData(grouped);
      setExpandedFournisseurs(new Set(allFrsIds));
      setGeneralLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setQueryError(message);
      toast.error('Erreur lors du chargement: ' + message);
      setGeneralLoading(false);
    }
  };

  useEffect(() => {
    if (showGeneral) loadGeneralData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGeneral]);

  const toGrandLivreLine = (e: Ecriture): GrandLivreLine => ({
    date: e.date,
    libelle: e.libelle,
    code_facture: e.code_facture,
    code_paiement: e.code_paiement,
    type_paiement: e.type_paiement,
    banque_code: e.banque_code,
    code_lettrage: e.paiement_factures && e.paiement_factures.length > 0 ? e.paiement_factures[0].code_lettrage : null,
    chantier_nom: e.chantier_id ? (allChantiers.find(c => c.id === e.chantier_id)?.nom || null) : null,
    notes: e.notes,
    type: e.type,
    debit: e.debit,
    credit: e.credit,
    solde: e.solde,
    statut: e.statut,
    filiale: e.filiale,
  });

  const filtered = useMemo(() => {
    let filteredIds = new Set<string>();
    let r = ecritures;
    if (chantierFilter) {
      const factureIds = new Set(
        ecritures.filter(e => e.type === 'facture' && e.chantier_id === chantierFilter).map(e => e.id)
      );
      filteredIds = new Set([
        ...factureIds,
        ...ecritures.filter(e => e.type === 'paiement' && e.paiement_factures?.some(pf => factureIds.has(pf.facture_id))).map(e => e.id),
      ]);
      r = ecritures.filter(e => filteredIds.has(e.id));
    }
    return r.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [ecritures, dateFrom, dateTo, chantierFilter]);

  const chantierOptions = useMemo(() => {
    const ids = new Set(ecritures.filter(e => e.type === 'facture' && e.chantier_id).map(e => e.chantier_id));
    return Array.from(ids).map(id => ({
      id: id!,
      nom: allChantiers.find(c => c.id === id)?.nom || id!,
    })).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [ecritures, allChantiers]);

  const chantierGroups = useMemo(() => {
    if (!groupByProjet) return [];
    const map = new Map<string, Ecriture[]>();
    for (const e of filtered) {
      if (e.type === 'facture') {
        const key = e.chantier_id || '__none__';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(e);
      }
    }
    const paiementsAssigned = new Set<string>();
    const groups: { id: string; nom: string; entries: Ecriture[] }[] = [];
    for (const [chId, factures] of map) {
      const paiements = filtered.filter(e =>
        e.type === 'paiement' &&
        e.paiement_factures?.some(pf => factures.some(f => f.id === pf.facture_id)) &&
        !paiementsAssigned.has(e.id)
      );
      paiements.forEach(p => paiementsAssigned.add(p.id));
      const entries = [...factures, ...paiements].sort((a, b) => a.date.localeCompare(b.date));
      let running = 0;
      entries.forEach(e => { running += e.credit - e.debit; e.solde = running; });
      groups.push({
        id: chId,
        nom: allChantiers.find(c => c.id === chId)?.nom || (chId === '__none__' ? 'Sans projet' : chId),
        entries,
      });
    }
    const unassignedPaiements = filtered.filter(e => e.type === 'paiement' && !paiementsAssigned.has(e.id));
    if (unassignedPaiements.length > 0) {
      let running = 0;
      unassignedPaiements.forEach(e => { running += e.credit - e.debit; e.solde = running; });
      groups.push({ id: '__none__', nom: 'Sans projet', entries: unassignedPaiements });
    }
    return groups.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [filtered, groupByProjet, allChantiers]);

  const flatEntries = useMemo(() => {
    let running = 0;
    return filtered.map(e => { running += e.credit - e.debit; return { ...e, solde: running }; });
  }, [filtered]);

  const stats = useMemo(() => {
    let totalDebit = 0, totalCredit = 0, totalLettre = 0, factureCount = 0;
    for (const e of ecritures) {
      totalDebit += e.debit;
      totalCredit += e.credit;
      if (e.type === 'facture') {
        factureCount++;
        if (e.lettre) totalLettre++;
      }
    }
    return { totalDebit, totalCredit, solde: totalCredit - totalDebit, totalLettre, totalFactures: factureCount, totalEcritures: ecritures.length };
  }, [ecritures]);

  const selectedFactures = useMemo(() => filtered.filter(e => e.type === 'facture' && selectedIds.has(e.id)), [filtered, selectedIds]);
  const selectedPaiements = useMemo(() => filtered.filter(e => e.type === 'paiement' && selectedIds.has(e.id)), [filtered, selectedIds]);
  const totalDebitSelected = useMemo(() => selectedPaiements.reduce((s, e) => s + e.debit, 0), [selectedPaiements]);
  const totalCreditSelected = useMemo(() => selectedFactures.reduce((s, e) => s + e.credit, 0), [selectedFactures]);
  const selectionALinks = useMemo(() => {
    return filtered.some(e => selectedIds.has(e.id) && e.paiement_factures && e.paiement_factures.length > 0);
  }, [filtered, selectedIds]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map((e) => e.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const sommeLiensFacture = async (factureId: string): Promise<number> => {
    const { data: liens } = await supabase
      .from('paiement_factures')
      .select('montant')
      .eq('facture_id', factureId);
    return (liens || []).reduce((s: number, l) => s + (Number(l.montant) || 0), 0);
  };

  const handleLettrage = async () => {
    if (selectedFactures.length === 0 || selectedPaiements.length === 0) {
      toast.warning('Sélectionnez au moins une facture et un paiement');
      return;
    }

    setLettrant(true);

    try {
      const sortedFactures = [...selectedFactures].sort((a, b) => a.date.localeCompare(b.date));
      const sortedPaiements = [...selectedPaiements].sort((a, b) => a.date.localeCompare(b.date));
      const paiementIds = sortedPaiements.map((p) => p.id);
      const factureIds = sortedFactures.map((f) => f.id);

      // Récupérer les IDs des factures qui étaient liées aux paiements (pour recalcul après suppression)
      const { data: oldLinks } = await supabase
        .from('paiement_factures')
        .select('facture_id')
        .in('paiement_id', paiementIds);
      const oldFactureIds = [...new Set((oldLinks || []).map((l) => l.facture_id))];

      // Supprimer tous les liens existants pour les paiements sélectionnés
      await supabase.from('paiement_factures').delete().in('paiement_id', paiementIds);

      // Recalculer toutes les factures affectées (anciennes + nouvelles)
      const allFactureIds = [...new Set([...oldFactureIds, ...factureIds])];
      for (const fid of allFactureIds) {
        const total = await sommeLiensFacture(fid);
        const { data: facture } = await supabase.from('factures').select('montant').eq('id', fid).single();
        const newStatut = total <= 0 ? 'Impayée' : total >= (facture?.montant || 0) ? 'Payée' : 'Partiellement payée';
        const { error: updateErr } = await supabase.from('factures').update({ montant_paye: total, statut: newStatut }).eq('id', fid);
        if (updateErr) throw updateErr;
      }

      // Distribution FIFO : allouer les paiements sélectionnés aux factures sélectionnées
      const { data: facturesData } = await supabase
        .from('factures')
        .select('id, montant, montant_paye, date_facture')
        .in('id', factureIds)
        .order('date_facture', { ascending: true });

      const codeLettrage = await generateCodeLettrage(fournisseurId);
      const links: { paiement_id: string; facture_id: string; montant: number; code_lettrage: string }[] = [];
      const remPaiements = new Map<string, number>();
      for (const p of sortedPaiements) {
        remPaiements.set(p.id, p.debit);
      }

      if (facturesData) {
        let paiementIndex = 0;
        for (const facture of facturesData) {
          const unpaid = facture.montant - facture.montant_paye;
          if (unpaid <= 0) continue;
          let remaining = unpaid;

          while (paiementIndex < sortedPaiements.length && remaining > 0) {
            const paiement = sortedPaiements[paiementIndex];
            const disponible = remPaiements.get(paiement.id) || 0;
            if (disponible <= 0) { paiementIndex++; continue; }
            const allocated = Math.min(remaining, disponible);
            links.push({ paiement_id: paiement.id, facture_id: facture.id, montant: allocated, code_lettrage: codeLettrage });
            remaining -= allocated;
            remPaiements.set(paiement.id, disponible - allocated);
            if (disponible <= allocated) paiementIndex++;
          }
        }
      }

      if (links.length > 0) {
        const { error: insertErr } = await supabase.from('paiement_factures').insert(links);
        if (insertErr) {
          toast.error('Erreur lors de la création des liaisons: ' + insertErr.message);
          setLettrant(false);
          return;
        }
      }

      // Recalculer les factures sélectionnées avec les nouveaux liens
      for (const fid of factureIds) {
        const total = await sommeLiensFacture(fid);
        const { data: facture } = await supabase.from('factures').select('montant').eq('id', fid).single();
        const newStatut = total <= 0 ? 'Impayée' : total >= (facture?.montant || 0) ? 'Payée' : 'Partiellement payée';
        const { error: updateErr } = await supabase.from('factures').update({ montant_paye: total, statut: newStatut }).eq('id', fid);
        if (updateErr) throw updateErr;
      }

      await loadData();
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent('factures-updated'));
      toast.success(`${links.length} liaison${links.length > 1 ? 's' : ''} créée${links.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Erreur lors du lettrage: ' + (err instanceof Error ? err.message : String(err)));
    }

    setLettrant(false);
  };

  const handleDelettrage = async () => {
    if (selectedPaiements.length === 0) {
      toast.warning('Sélectionnez au moins un paiement à délettrer');
      return;
    }

    setDelettrant(true);

    try {
      const paiementIds = selectedPaiements.map((p) => p.id);

      const { data: oldLinks } = await supabase
        .from('paiement_factures')
        .select('facture_id')
        .in('paiement_id', paiementIds);
      const affectedFactureIds = [...new Set((oldLinks || []).map((l) => l.facture_id))];

      await supabase.from('paiement_factures').delete().in('paiement_id', paiementIds);

      for (const fid of affectedFactureIds) {
        const total = await sommeLiensFacture(fid);
        const { data: facture } = await supabase.from('factures').select('montant').eq('id', fid).single();
        const newStatut = total <= 0 ? 'Impayée' : total >= (facture?.montant || 0) ? 'Payée' : 'Partiellement payée';
        const { error: updateErr } = await supabase.from('factures').update({ montant_paye: total, statut: newStatut }).eq('id', fid);
        if (updateErr) throw updateErr;
      }

      await loadData();
      setSelectedIds(new Set());
      window.dispatchEvent(new CustomEvent('factures-updated'));
      toast.success('Délettrage effectué');
    } catch (err) {
      toast.error('Erreur lors du délettrage: ' + (err instanceof Error ? err.message : String(err)));
    }

    setDelettrant(false);
  };

  const filteredFournisseurs = useMemo(() => {
    if (!searchFournisseur.trim()) return allFournisseurs;
    const s = searchFournisseur.toLowerCase();
    return allFournisseurs.filter((f) =>
      f.nom.toLowerCase().includes(s) ||
      (f.domaine_activite || '').toLowerCase().includes(s)
    );
  }, [allFournisseurs, searchFournisseur]);

  const generalGroups = useMemo(() => {
    if (!showGeneral) return [];
    const groups: { id: string; nom: string; entries: Ecriture[]; totalDebit: number; totalCredit: number; solde: number }[] = [];
    for (const [frsId, entries] of generalData) {
      const nom = allFournisseurs.find(f => f.id === frsId)?.nom || frsId;
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      const solde = entries.length > 0 ? entries[entries.length - 1].solde : 0;
      groups.push({ id: frsId, nom, entries, totalDebit, totalCredit, solde });
    }
    groups.sort((a, b) => a.nom.localeCompare(b.nom));
    return groups;
  }, [showGeneral, generalData, allFournisseurs]);

  const filteredGeneralGroups = useMemo(() => {
    return generalGroups.map(group => {
      let entries = group.entries;
      if (chantierFilter) {
        const factureIds = new Set(
          entries.filter(e => e.type === 'facture' && e.chantier_id === chantierFilter).map(e => e.id)
        );
        const ids = new Set([
          ...factureIds,
          ...entries.filter(e => e.type === 'paiement' && e.paiement_factures?.some(pf => factureIds.has(pf.facture_id))).map(e => e.id),
        ]);
        entries = entries.filter(e => ids.has(e.id));
      }
      entries = entries.filter(e => {
        if (dateFrom && e.date < dateFrom) return false;
        if (dateTo && e.date > dateTo) return false;
        return true;
      });
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
      const solde = entries.length > 0 ? entries[entries.length - 1].solde : 0;
      return { ...group, entries, totalDebit, totalCredit, solde };
    }).filter(g => g.entries.length > 0);
  }, [generalGroups, dateFrom, dateTo, chantierFilter]);

  if (!fournisseurId && !showGeneral) {
    return (
      <div>
        <div className="card mb-6 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-teal-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Grand Livre</h2>
                <p className="text-sm text-gray-500">Sélectionnez un fournisseur ou consultez le grand livre général</p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowGeneral(true)}
          className="card mb-6 text-left hover:shadow-lg hover:border-teal-200 transition-all group w-full overflow-hidden"
        >
          <div className="px-6 py-5 bg-gradient-to-r from-teal-500 to-teal-600 flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-bold text-white">Grand Livre Général</p>
              <p className="text-sm text-white/80">Tous les fournisseurs • Vue consolidée groupée par fournisseur</p>
            </div>
            <ChevronRight className="w-6 h-6 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </div>
        </button>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchFournisseur}
              onChange={(e) => setSearchFournisseur(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredFournisseurs.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500 font-medium">
              Aucun fournisseur trouvé
            </div>
          ) : filteredFournisseurs.map((f) => (
            <button
              key={f.id}
              onClick={() => navigate(`/grand-livre/${f.id}`)}
              className="card text-left hover:shadow-lg hover:border-teal-200 transition-all group"
            >
              <div className="px-5 py-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{f.nom}</p>
                  {f.domaine_activite && (
                    <p className="text-xs text-gray-500 truncate">{f.domaine_activite}</p>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-teal-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showGeneral) {
    const grandStats = filteredGeneralGroups.reduce(
      (acc, g) => ({
        totalDebit: acc.totalDebit + g.totalDebit,
        totalCredit: acc.totalCredit + g.totalCredit,
        totalFactures: acc.totalFactures + g.entries.filter(e => e.type === 'facture').length,
        totalPaiements: acc.totalPaiements + g.entries.filter(e => e.type === 'paiement').length,
      }),
      { totalDebit: 0, totalCredit: 0, totalFactures: 0, totalPaiements: 0 },
    );

    return (
      <div>
        <button
          onClick={() => { setShowGeneral(false); setGeneralData(new Map()); }}
          className="btn-secondary text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la sélection
        </button>

        <div className="card mb-6 overflow-hidden">
          <div className="px-6 py-5 bg-gradient-to-r from-teal-50 to-white border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Grand Livre Général</h2>
                <p className="text-sm text-gray-500">
                  {filteredGeneralGroups.length} fournisseur{filteredGeneralGroups.length > 1 ? 's' : ''} •
                  {' '}{grandStats.totalFactures} facture{grandStats.totalFactures > 1 ? 's' : ''} •
                  {' '}{grandStats.totalPaiements} paiement{grandStats.totalPaiements > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-6 py-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Débit</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(grandStats.totalDebit)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Crédit</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(grandStats.totalCredit)}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solde Global</p>
              <p className={`text-lg font-bold mt-1 ${(grandStats.totalCredit - grandStats.totalDebit) > 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>
                {formatCurrency(grandStats.totalCredit - grandStats.totalDebit)}
              </p>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              {chantierOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Projet</span>
                  <select
                    value={chantierFilter}
                    onChange={(e) => setChantierFilter(e.target.value)}
                    className="select-field text-sm py-1.5 w-auto max-w-[180px]"
                  >
                    <option value="">Tous les projets</option>
                    {chantierOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.nom}</option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={async () => {
                  const sections = filteredGeneralGroups
                    .filter(g => g.entries.length > 0)
                    .map(g => ({ title: g.nom, entries: g.entries.map(toGrandLivreLine) }));
                  if (sections.length > 0) {
                    const { generateGrandLivrePdfSections } = await import('../lib/generateReceipt');
                    generateGrandLivrePdfSections('TOUS LES FOURNISSEURS', sections);
                  }
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-jeta-blue hover:text-jeta-blue transition-colors"
              >
                <Download className="w-3.5 h-3.5 inline-block mr-1" />
                Export PDF
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Du</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field text-sm py-1.5 w-auto" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Au</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field text-sm py-1.5 w-auto" />
              </div>
              {(dateFrom || dateTo) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1 transition-colors">
                  <X className="w-3 h-3" /> Réinitialiser
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Fournisseur</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Libellé</th>
                  <th className="text-center px-3 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-20">Lettrage</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Débit</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Crédit</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Solde</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-36">Statut</th>
                </tr>
              </thead>
              <tbody>
                {generalLoading ? (
                  <tr><td colSpan={8}><SkeletonTable rows={8} cols={8} /></td></tr>
                ) : filteredGeneralGroups.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-500 font-medium">{queryError ? `Erreur : ${queryError}` : 'Aucune écriture trouvée'}</span>
                    </div>
                  </td></tr>
                ) : (
                  filteredGeneralGroups.flatMap((group) => {
                    const isExpanded = expandedFournisseurs.has(group.id);
                    const rows: JSX.Element[] = [
                      <tr key={`frs-${group.id}`} className="bg-gradient-to-r from-amber-50/80 to-gray-50/80 border-b border-amber-200 cursor-pointer hover:bg-amber-100/30 transition-colors" onClick={() => setExpandedFournisseurs(prev => { const n = new Set(prev); if (n.has(group.id)) n.delete(group.id); else n.add(group.id); return n; })}>
                        <td colSpan={8} className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronRight className={`w-4 h-4 text-amber-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span className="font-bold text-amber-800">{group.nom}</span>
                            <span className="text-xs text-amber-600 font-semibold">
                              {group.entries.filter(e => e.type === 'facture').length} facture(s) · {group.entries.filter(e => e.type === 'paiement').length} paiement(s)
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              D: {formatCurrency(group.totalDebit)} · C: {formatCurrency(group.totalCredit)} · S: <span className={group.solde > 0 ? 'text-jeta-red font-bold' : group.solde < 0 ? 'text-emerald-600 font-bold' : ''}>{formatCurrency(group.solde)}</span>
                            </span>
                          </div>
                        </td>
                      </tr>,
                    ];

                    if (isExpanded) {
                      for (const entry of group.entries) {
                        const isFacture = entry.type === 'facture';
                        const bgClass = isFacture && entry.lettre ? 'bg-emerald-50/40' : '';
                        const typeClass = isFacture ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-jeta-blue/40';

                        rows.push(
                          <tr key={`${group.id}-${entry.type}-${entry.id}`} className={`table-row ${bgClass} ${typeClass}`}>
                            <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                            <td className="px-5 py-3">
                              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">{group.nom}</span>
                            </td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {isFacture ? (
                                  <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{entry.code_facture}</span>
                                ) : (
                                  <span className="font-mono text-xs font-semibold text-jeta-blue bg-jeta-blue/10 px-2 py-0.5 rounded-md">{entry.code_paiement}</span>
                                )}
                                {entry.type_paiement && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{entry.type_paiement}</span>}
                                <span className="text-gray-600 truncate text-xs font-semibold">{entry.filiale ? entry.filiale.nom : (isFacture ? 'Facture' : 'Paiement')}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {entry.paiement_factures && entry.paiement_factures.length > 0 ? (
                                <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">{entry.paiement_factures.map(pf => pf.code_lettrage).filter(Boolean)[0] || '—'}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.debit < 0 ? 'text-jeta-red' : 'text-gray-900'}`}>{entry.debit !== 0 ? formatCurrency(entry.debit) : ''}</td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.credit < 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>{entry.credit !== 0 ? formatCurrency(entry.credit) : ''}</td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.solde > 0 ? 'text-jeta-red' : entry.solde < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{formatCurrency(entry.solde)}</td>
                            <td className="px-5 py-3">
                              {isFacture && entry.statut ? (
                                <div className="flex flex-col gap-1">
                                  <span className={`${statutBadgeStyles[entry.statut] || 'badge badge-gray'} inline-flex items-center gap-1 text-xs`}>
                                    {entry.statut === 'Payée' ? <CheckCircle className="w-3 h-3" /> :
                                     entry.statut === 'Impayée' ? <AlertTriangle className="w-3 h-3" /> :
                                     entry.statut === 'Partiellement payée' ? <Clock className="w-3 h-3" /> :
                                     <Ban className="w-3 h-3" />}
                                    {entry.statut}
                                  </span>
                                  {entry.lettre && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Lettrée</span>}
                                </div>
                              ) : <span className="text-xs text-gray-400 italic">Paiement</span>}
                            </td>
                          </tr>
                        );
                      }
                    }

                    return rows;
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/fournisseurs')}
        className="btn-secondary text-sm mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux fournisseurs
      </button>

      <div className="card mb-6 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-white border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Grand Livre — {fournisseur?.nom || 'Fournisseur'}
              </h2>
              <p className="text-sm text-gray-500">
                {stats.totalEcritures} écriture{stats.totalEcritures > 1 ? 's' : ''} · {stats.totalLettre} lettrée{stats.totalLettre > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Débit (Paiements)</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(stats.totalDebit)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Crédit (Factures)</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalCredit)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Solde</p>
            <p className={`text-lg font-bold mt-1 ${stats.solde > 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>
              {formatCurrency(stats.solde)}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lettrage</p>
            <p className="text-lg font-bold text-purple-700 mt-1">
              {stats.totalLettre} / {stats.totalFactures}
            </p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {chantierOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Projet</span>
                <select
                  value={chantierFilter}
                  onChange={(e) => setChantierFilter(e.target.value)}
                  className="select-field text-sm py-1.5 w-auto max-w-[180px]"
                >
                  <option value="">Tous les projets</option>
                  {chantierOptions.map((o) => (
                    <option key={o.id} value={o.id}>{o.nom}</option>
                  ))}
                </select>
              </div>
            )}
            {chantierOptions.length > 1 && (
              <button
                onClick={() => setGroupByProjet(!groupByProjet)}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${groupByProjet ? 'bg-jeta-blue text-white border-jeta-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-jeta-blue hover:text-jeta-blue'}`}
              >
                {groupByProjet ? 'Vue normale' : 'Grouper par projet'}
              </button>
            )}
            {fournisseur && (
              <button
                onClick={async () => {
                  const { generateGrandLivrePdf, generateGrandLivrePdfSections } = await import('../lib/generateReceipt');
                  if (groupByProjet) {
                    const sections = chantierGroups
                      .filter(g => g.entries.length > 0)
                      .map(g => ({ title: g.nom, entries: g.entries.map(toGrandLivreLine) }));
                    if (sections.length > 0) generateGrandLivrePdfSections(fournisseur.nom, sections);
                  } else {
                    generateGrandLivrePdf(fournisseur.nom, flatEntries.map(toGrandLivreLine));
                  }
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-jeta-blue hover:text-jeta-blue transition-colors"
              >
                <Download className="w-3.5 h-3.5 inline-block mr-1" />
                Export PDF
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Du</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="input-field text-sm py-1.5 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Au</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="input-field text-sm py-1.5 w-auto"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                {selectedFactures.length} facture{selectedFactures.length > 1 ? 's' : ''} ({formatCurrency(totalCreditSelected)}) ·
                {selectedPaiements.length} paiement{selectedPaiements.length > 1 ? 's' : ''} ({formatCurrency(totalDebitSelected)})
              </span>
              <button onClick={deselectAll} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-3 h-3 inline" /> Effacer
              </button>
              {hasPerm('grand-livre', 'edit') && (
                <button
                  onClick={handleLettrage}
                  disabled={lettrant || selectedFactures.length === 0 || selectedPaiements.length === 0}
                  className={`btn-primary text-sm ${totalCreditSelected === totalDebitSelected ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-jeta-blue hover:bg-jeta-blue-dark'}`}
                >
                  {lettrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {lettrant ? 'Lettrage...' : `Lettrer (${totalCreditSelected === totalDebitSelected ? 'Équilibré' : 'Partiel'})`}
                </button>
              )}
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-center px-3 py-3.5 w-8">
                  {hasPerm('grand-livre', 'edit') && (
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={() => selectedIds.size === filtered.length ? deselectAll() : selectAll()}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  )}
                </th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Libellé</th>
                <th className="text-center px-3 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-20">Lettrage</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Débit</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Crédit</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Solde</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-36">Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><SkeletonTable rows={8} cols={8} /></td></tr>
              ) : groupByProjet ? (
                chantierGroups.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-500 font-medium">Aucune écriture trouvée</span>
                    </div>
                  </td></tr>
                ) : (
                  chantierGroups.flatMap((group) => {
                    const isExpanded = expandedChantiers.has(group.id);
                    const totalDebit = group.entries.reduce((s, e) => s + e.debit, 0);
                    const totalCredit = group.entries.reduce((s, e) => s + e.credit, 0);
                    const finalSolde = group.entries.length > 0 ? group.entries[group.entries.length - 1].solde : 0;

                    const rows: JSX.Element[] = [
                      <tr key={`g-${group.id}`} className="bg-gradient-to-r from-amber-50/80 to-gray-50/80 border-b border-amber-200 cursor-pointer hover:bg-amber-100/30 transition-colors" onClick={() => setExpandedChantiers(prev => { const n = new Set(prev); if (n.has(group.id)) n.delete(group.id); else n.add(group.id); return n; })}>
                        <td colSpan={8} className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <ChevronRight className={`w-4 h-4 text-amber-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span className="font-bold text-amber-800">{group.nom}</span>
                            <span className="text-xs text-amber-600 font-semibold">
                              {group.entries.filter(e => e.type === 'facture').length} facture(s) · {group.entries.filter(e => e.type === 'paiement').length} paiement(s)
                            </span>
                            <span className="ml-auto text-xs text-gray-500">
                              D: {formatCurrency(totalDebit)} · C: {formatCurrency(totalCredit)} · S: <span className={finalSolde > 0 ? 'text-jeta-red font-bold' : finalSolde < 0 ? 'text-emerald-600 font-bold' : ''}>{formatCurrency(finalSolde)}</span>
                            </span>
                          </div>
                        </td>
                      </tr>
                    ];

                    if (isExpanded) {
                      for (const entry of group.entries) {
                        const isFacture = entry.type === 'facture';
                        const isSelected = selectedIds.has(entry.id);
                        const bgClass = isFacture && entry.lettre ? 'bg-emerald-50/40' : isSelected ? 'bg-purple-50/40' : '';
                        const typeClass = isFacture ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-jeta-blue/40';
                        rows.push(
                          <tr key={`${entry.type}-${entry.id}`} className={`table-row ${bgClass} ${typeClass}`}>
                            <td className="px-3 py-3 text-center">
                              {hasPerm('grand-livre', 'edit') && <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(entry.id)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />}
                            </td>
                            <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                {isFacture ? (
                                  <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{entry.code_facture}</span>
                                ) : (
                                  <span className="font-mono text-xs font-semibold text-jeta-blue bg-jeta-blue/10 px-2 py-0.5 rounded-md">{entry.code_paiement}</span>
                                )}
                                {entry.type_paiement && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{entry.type_paiement}</span>}
                                <span className="text-gray-600 truncate text-xs font-semibold">{entry.filiale ? entry.filiale.nom : (isFacture ? 'Facture' : 'Paiement')}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {entry.paiement_factures && entry.paiement_factures.length > 0 ? (
                                <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">{entry.paiement_factures.map(pf => pf.code_lettrage).filter(Boolean)[0] || '—'}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.debit < 0 ? 'text-jeta-red' : 'text-gray-900'}`}>{entry.debit !== 0 ? formatCurrency(entry.debit) : ''}</td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.credit < 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>{entry.credit !== 0 ? formatCurrency(entry.credit) : ''}</td>
                            <td className={`px-5 py-3 text-right font-bold whitespace-nowrap ${entry.solde > 0 ? 'text-jeta-red' : entry.solde < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{formatCurrency(entry.solde)}</td>
                            <td className="px-5 py-3">
                              {isFacture && entry.statut ? (
                                <div className="flex flex-col gap-1">
                                  <span className={`${statutBadgeStyles[entry.statut] || 'badge badge-gray'} inline-flex items-center gap-1 text-xs`}>
                                    {entry.statut === 'Payée' ? <CheckCircle className="w-3 h-3" /> :
                                     entry.statut === 'Impayée' ? <AlertTriangle className="w-3 h-3" /> :
                                     entry.statut === 'Partiellement payée' ? <Clock className="w-3 h-3" /> :
                                     <Ban className="w-3 h-3" />}
                                    {entry.statut}
                                  </span>
                                  {entry.lettre && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Lettrée</span>}
                                </div>
                              ) : <span className="text-xs text-gray-400 italic">Paiement</span>}
                            </td>
                          </tr>
                        );
                      }
                    }

                    return rows;
                  })
                )
              ) : (
                flatEntries.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="w-6 h-6 text-gray-400" />
                      <span className="text-gray-500 font-medium">{queryError ? `Erreur : ${queryError}` : 'Aucune écriture trouvée'}</span>
                    </div>
                  </td></tr>
                ) : (
                  flatEntries.map((entry) => {
                    const isFacture = entry.type === 'facture';
                    const isSelected = selectedIds.has(entry.id);
                    const bgClass = isFacture && entry.lettre ? 'bg-emerald-50/40' : isSelected ? 'bg-purple-50/40' : '';
                    const typeClass = isFacture ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-jeta-blue/40';

  return (
                      <tr key={`${entry.type}-${entry.id}`} className={`table-row ${bgClass} ${typeClass}`}>
                        <td className="px-3 py-3.5 text-center">
                          {hasPerm('grand-livre', 'edit') && <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(entry.id)} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />}
                        </td>
                        <td className="px-5 py-3.5 text-gray-700 whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {isFacture ? (
                              <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">{entry.code_facture}</span>
                            ) : (
                              <span className="font-mono text-xs font-semibold text-jeta-blue bg-jeta-blue/10 px-2 py-0.5 rounded-md">{entry.code_paiement}</span>
                            )}
                            {entry.type_paiement && <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">{entry.type_paiement}</span>}
                            <span className="text-gray-600 truncate text-xs font-semibold">{entry.filiale ? entry.filiale.nom : (isFacture ? 'Facture' : 'Paiement')}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          {entry.paiement_factures && entry.paiement_factures.length > 0 ? (
                            <span className="font-mono text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold">{entry.paiement_factures.map(pf => pf.code_lettrage).filter(Boolean)[0] || '—'}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${entry.debit < 0 ? 'text-jeta-red' : 'text-gray-900'}`}>{entry.debit !== 0 ? formatCurrency(entry.debit) : ''}</td>
                        <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${entry.credit < 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>{entry.credit !== 0 ? formatCurrency(entry.credit) : ''}</td>
                        <td className={`px-5 py-3.5 text-right font-bold whitespace-nowrap ${entry.solde > 0 ? 'text-jeta-red' : entry.solde < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>{formatCurrency(entry.solde)}</td>
                        <td className="px-5 py-3.5">
                          {isFacture && entry.statut ? (
                            <div className="flex flex-col gap-1">
                              <span className={`${statutBadgeStyles[entry.statut] || 'badge badge-gray'} inline-flex items-center gap-1 text-xs`}>
                                {entry.statut === 'Payée' ? <CheckCircle className="w-3 h-3" /> :
                                 entry.statut === 'Impayée' ? <AlertTriangle className="w-3 h-3" /> :
                                 entry.statut === 'Partiellement payée' ? <Clock className="w-3 h-3" /> :
                                 <Ban className="w-3 h-3" />}
                                {entry.statut}
                              </span>
                              {entry.lettre && <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Lettrée</span>}
                            </div>
                          ) : <span className="text-xs text-gray-400 italic">Paiement</span>}
                        </td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasPerm('grand-livre', 'edit') && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-semibold text-gray-900">{selectedFactures.length + selectedPaiements.length} sélectionné{(selectedFactures.length + selectedPaiements.length) > 1 ? 's' : ''}</span>
                <span className="text-gray-400">|</span>
                <span className="text-amber-600 font-semibold">{selectedFactures.length} facture{selectedFactures.length > 1 ? 's' : ''} · {formatCurrency(totalCreditSelected)}</span>
                <span className="text-gray-400">|</span>
                <span className="text-jeta-blue font-semibold">{selectedPaiements.length} paiement{selectedPaiements.length > 1 ? 's' : ''} · {formatCurrency(totalDebitSelected)}</span>
                {totalCreditSelected === totalDebitSelected && totalCreditSelected > 0 && (
                  <>
                    <span className="text-gray-400">|</span>
                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Équilibré
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={deselectAll} className="btn-secondary text-sm">Annuler</button>
                {selectionALinks && (
                  <button
                    onClick={handleDelettrage}
                    disabled={delettrant || selectedPaiements.length === 0}
                    className="btn-secondary text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  >
                    {delettrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                    {delettrant ? 'Délettrage...' : 'Délettrer'}
                  </button>
                )}
                <button
                  onClick={handleLettrage}
                  disabled={lettrant || selectedFactures.length === 0 || selectedPaiements.length === 0}
                  className={`btn-primary text-sm ${totalCreditSelected === totalDebitSelected && totalCreditSelected > 0 ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                >
                  {lettrant ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {lettrant ? 'Lettrage...' : 'Lettrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Users({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
