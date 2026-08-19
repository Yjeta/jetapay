import { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { supabase } from '../lib/supabase';
import { usePaiements, useFilialles, useFournisseurs } from '../hooks/useData';
import { useDashboardStats } from '../hooks/useData';
import { DashboardCards } from '../components/DashboardCards';
const ChartByType = lazy(() => import('../components/ChartByType'));
const ChartByFiliale = lazy(() => import('../components/ChartByFiliale'));
const ChartEvolution = lazy(() => import('../components/ChartEvolution'));
import { PaiementForm } from '../components/PaiementForm';
import { ImportPaiementsModal } from '../components/ImportPaiementsModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonCard, SkeletonTable, SkeletonChart } from '../components/Skeleton';
import { formatCurrency, formatDate } from '../lib/utils';
import { useToast } from '../hooks/useToast';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Banknote,
  ArrowRightLeft,
  ArrowLeftRight,
  FileCheck,
  Receipt,
  Handshake,
  X,
  Wallet,
  SlidersHorizontal,
  CalendarRange,
  Printer,
  Info,
  Calendar,
  Building2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Upload as UploadIcon,
} from 'lucide-react';
import type { Paiement } from '../types';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 10;

const typeIcons: Record<string, React.ElementType> = {
  Cash: Banknote,
  Chèque: FileCheck,
  Virement: ArrowRightLeft,
  Traite: Receipt,
  'Mise à disposition': Handshake,
  'Opération bancaire': ArrowRightLeft,
};

const typeBadgeStyles: Record<string, string> = {
  Cash: 'badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200',
  Chèque: 'badge bg-gradient-to-r from-blue-100 to-blue-50 text-jeta-blue border-blue-200',
  Virement: 'badge bg-gradient-to-r from-emerald-100 to-emerald-50 text-jeta-green-dark border-emerald-200',
  Traite: 'badge bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 border-purple-200',
  'Mise à disposition': 'badge bg-gradient-to-r from-teal-100 to-teal-50 text-teal-700 border-teal-200',
  'Opération bancaire': 'badge bg-gradient-to-r from-sky-100 to-sky-50 text-sky-700 border-sky-200',
};

const statutBadgeStyles: Record<string, string> = {
  'Validé': 'badge bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200',
  'En attente': 'badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200',
  'Rejeté': 'badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200',
  'Annulé': 'badge bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200',
};

export function PaiementsPage() {
  const { data: paiements, loading: loadingPaiements, refresh } = usePaiements();
  const { data: filiales } = useFilialles();
  const { data: fournisseurs } = useFournisseurs();
  const toast = useToast();
  const { hasPerm, role } = useAuth();

  useEffect(() => {
    const interval = setInterval(refresh, 15000);
    const onFacturesUpdated = () => refresh();
    window.addEventListener('factures-updated', onFacturesUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('factures-updated', onFacturesUpdated);
    };
  }, [refresh]);

  const [showForm, setShowForm] = useState(false);
  const [dashboardDateFrom, setDashboardDateFrom] = useState('');
  const [dashboardDateTo, setDashboardDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string>('date_paiement');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const dashboardPaiements = useMemo(() => {
    return paiements.filter((p) => {
      if (p.deleted_at) return false;
      if (dashboardDateFrom && p.date_paiement < dashboardDateFrom) return false;
      if (dashboardDateTo && p.date_paiement > dashboardDateTo) return false;
      return true;
    });
  }, [paiements, dashboardDateFrom, dashboardDateTo]);

  const stats = useDashboardStats(dashboardPaiements);
  const [editingPaiement, setEditingPaiement] = useState<Paiement | null>(null);
  const [duplicatingPaiement, setDuplicatingPaiement] = useState<Paiement | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [filters, setFilters] = useState({
    filiale: '',
    fournisseur: '',
    type: '',
    statut: '',
    dateFrom: '',
    dateTo: '',
  });

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value);
      setPage(0);
    }, 300);
  }, []);

  const filtered = useMemo(() => {
    const result = paiements.filter((p) => {
      const s = search.toLowerCase();
      const matchesSearch =
        !s ||
        (p.fournisseur?.nom || '').toLowerCase().includes(s) ||
        (p.filiale_receptrice?.nom || '').toLowerCase().includes(s) ||
        p.filiale.nom.toLowerCase().includes(s) ||
        (p.reference || '').toLowerCase().includes(s) ||
        p.montant.toString().includes(s);

      const matchesFiliale = !filters.filiale || p.filiale_id === filters.filiale;
      const matchesFournisseur = !filters.fournisseur || p.fournisseur_id === filters.fournisseur;
      const matchesType = !filters.type || p.type_paiement === filters.type;
      const matchesStatut = !filters.statut || p.statut === filters.statut;
      const matchesDateFrom = !filters.dateFrom || p.date_paiement >= filters.dateFrom;
      const matchesDateTo = !filters.dateTo || p.date_paiement <= filters.dateTo;

      return matchesSearch && matchesFiliale && matchesFournisseur && matchesType && matchesStatut && matchesDateFrom && matchesDateTo;
    });

    result.sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortKey) {
        case 'date_paiement': aVal = a.date_paiement; bVal = b.date_paiement; break;
        case 'code_paiement': aVal = a.code_paiement || ''; bVal = b.code_paiement || ''; break;
        case 'filiale': aVal = a.filiale.nom; bVal = b.filiale.nom; break;
        case 'fournisseur': aVal = (a.fournisseur?.nom || a.filiale_receptrice?.nom || ''); bVal = (b.fournisseur?.nom || b.filiale_receptrice?.nom || ''); break;
        case 'type_paiement': aVal = a.type_paiement; bVal = b.type_paiement; break;
        case 'montant': aVal = a.montant; bVal = b.montant; break;
        case 'reference': aVal = a.reference || ''; bVal = b.reference || ''; break;
        case 'statut': aVal = a.statut; bVal = b.statut; break;
        default: aVal = a.date_paiement; bVal = b.date_paiement;
      }
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(String(bVal)) : String(bVal).localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - Number(bVal) : Number(bVal) - aVal;
    });

    return result;
  }, [paiements, search, filters, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  const handleDelete = async () => {
    if (!deletingId) return;
    const { data: links } = await supabase
      .from('paiement_factures')
      .select('facture_id')
      .eq('paiement_id', deletingId);
    const factureIds = (links || []).map((l) => l.facture_id);
    await supabase.from('paiement_factures').delete().eq('paiement_id', deletingId);
    const { error } = await supabase.from('paiements').update({ deleted_at: new Date().toISOString() }).eq('id', deletingId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      for (const fid of factureIds) {
        const { data: resteLinks } = await supabase
          .from('paiement_factures')
          .select('montant')
          .eq('facture_id', fid);
        const total = (resteLinks || []).reduce((s, l) => s + (Number(l.montant) || 0), 0);
        const { data: facture } = await supabase.from('factures').select('montant').eq('id', fid).single();
        const statut = total <= 0 ? 'Impayée' : total >= (facture?.montant || 0) ? 'Payée' : 'Partiellement payée';
        const { error: updateErr } = await supabase.from('factures').update({ montant_paye: total, statut }).eq('id', fid);
        if (updateErr) toast.error(`Erreur mise à jour facture: ${updateErr.message}`);
      }
      window.dispatchEvent(new CustomEvent('factures-updated'));
      toast.success('Paiement supprimé avec succès');
    }
    setDeletingId(null);
    refresh();
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('paiements').update({ deleted_at: null }).eq('id', id);
    if (error) toast.error('Erreur lors de la restauration');
    else { toast.success('Paiement restauré'); refresh(); }
  };

  const handleHardDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('paiements').delete().eq('id', deletingId);
    if (error) toast.error('Erreur lors de la suppression définitive');
    else { toast.success('Paiement supprimé définitivement'); refresh(); }
    setDeletingId(null);
  };

  const handleEdit = (p: Paiement) => {
    setEditingPaiement(p);
    setShowForm(true);
  };

  const handleDuplicate = (p: Paiement) => {
    setDuplicatingPaiement(p);
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingPaiement(null);
    setDuplicatingPaiement(null);
    setShowForm(true);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingPaiement(null);
    setDuplicatingPaiement(null);
    refresh();
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div>
      {/* Dashboard Date Range */}
      <div className="card mb-6 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-jeta-blue/5 to-transparent border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <CalendarRange className="w-4 h-4 text-jeta-blue" />
            Plage de dates du tableau de bord
          </div>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Du</span>
              <input
                type="date"
                value={dashboardDateFrom}
                onChange={(e) => setDashboardDateFrom(e.target.value)}
                className="input-field text-sm py-1.5 w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Au</span>
              <input
                type="date"
                value={dashboardDateTo}
                onChange={(e) => setDashboardDateTo(e.target.value)}
                className="input-field text-sm py-1.5 w-auto"
              />
            </div>
            {(dashboardDateFrom || dashboardDateTo) && (
              <button
                onClick={() => { setDashboardDateFrom(''); setDashboardDateTo(''); }}
                className="text-xs text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {dashboardPaiements.length} / {paiements.length} paiements
          </span>
        </div>
      </div>

      {role !== 'assistant' && role !== 'comptable' && (
        loadingPaiements ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : (
          <DashboardCards stats={stats} />
        )
      )}

      {role !== 'assistant' && role !== 'comptable' && (
        loadingPaiements ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <SkeletonChart /><SkeletonChart />
          </div>
        ) : (
          <Suspense fallback={<SkeletonChart />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartByType stats={stats} />
              <ChartByFiliale stats={stats} />
            </div>
          </Suspense>
        )
      )}

      {role !== 'assistant' && !loadingPaiements && stats.parMois.length > 1 && (
        <Suspense fallback={<SkeletonChart />}>
          <div className="mb-8">
            <ChartEvolution stats={stats} />
          </div>
        </Suspense>
      )}

      <div className="card overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Paiements</h2>
              <p className="text-sm text-gray-500">
                {filtered.length.toLocaleString('fr-FR')} enregistrement{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] lg:min-w-[260px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                defaultValue={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary ${activeFiltersCount > 0 ? 'border-jeta-blue text-jeta-blue bg-jeta-blue/5' : ''}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filtres</span>
              {activeFiltersCount > 0 && (
                <span className="bg-jeta-blue text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.5rem]">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {hasPerm('paiements', 'create') && (
              <button onClick={() => setShowImport(true)} className="btn-secondary">
                <UploadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Importer</span>
              </button>
            )}
            {hasPerm('paiements', 'create') && (
              <button onClick={handleNew} className="btn-primary">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau</span>
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="px-6 py-5 bg-gray-50/80 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-slide-down">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Filiale</label>
              <select
                value={filters.filiale}
                onChange={(e) => { setFilters({ ...filters, filiale: e.target.value }); setPage(0); }}
                className="select-field"
              >
                <option value="">Toutes</option>
                {filiales.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fournisseur</label>
              <select
                value={filters.fournisseur}
                onChange={(e) => { setFilters({ ...filters, fournisseur: e.target.value }); setPage(0); }}
                className="select-field"
              >
                <option value="">Tous</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Type</label>
              <select
                value={filters.type}
                onChange={(e) => { setFilters({ ...filters, type: e.target.value }); setPage(0); }}
                className="select-field"
              >
                <option value="">Tous</option>
                <option value="Cash">Cash</option>
                <option value="Chèque">Chèque</option>
                <option value="Virement">Virement</option>
                <option value="Traite">Traite</option>
                <option value="Mise à disposition">Mise à disposition</option>
                <option value="Opération bancaire">Opération bancaire</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Statut</label>
              <select
                value={filters.statut}
                onChange={(e) => { setFilters({ ...filters, statut: e.target.value }); setPage(0); }}
                className="select-field"
              >
                <option value="">Tous</option>
                <option value="Validé">Validé</option>
                <option value="En attente">En attente</option>
                <option value="Rejeté">Rejeté</option>
                <option value="Annulé">Annulé</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date début</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => { setFilters({ ...filters, dateFrom: e.target.value }); setPage(0); }}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date fin</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => { setFilters({ ...filters, dateTo: e.target.value }); setPage(0); }}
                className="input-field"
              />
            </div>
            <div className="sm:col-span-3 lg:col-span-6 flex justify-end pt-2">
              <button
                onClick={() => { setFilters({ filiale: '', fournisseur: '', type: '', statut: '', dateFrom: '', dateTo: '' }); setPage(0); }}
                className="text-sm text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1.5 hover:underline transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto table-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                {[
                  { key: 'date_paiement', label: 'Date', align: 'text-left' },
                  { key: 'code_paiement', label: 'Code', align: 'text-left' },
                  { key: 'filiale', label: 'Filiale', align: 'text-left' },
                  { key: 'fournisseur', label: 'Fournisseur', align: 'text-left' },
                  { key: 'type_paiement', label: 'Type', align: 'text-left' },
                  { key: 'montant', label: 'Montant', align: 'text-right' },
                  { key: 'reference', label: 'Référence', align: 'text-left' },
                  { key: 'statut', label: 'Statut', align: 'text-left' },
                  { key: null, label: 'Actions', align: 'text-center' },
                ].map((col) => (
                  <th
                    key={col.key || 'actions'}
                    className={`px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider ${col.align} ${col.key ? 'cursor-pointer hover:bg-gray-100/50 select-none transition-colors' : 'w-24'}`}
                    onClick={() => col.key && handleSort(col.key)}
                  >
                    <div className={`inline-flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : ''}`}>
                      <span>{col.label}</span>
                      {col.key && sortKey === col.key && (
                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                      {col.key && sortKey !== col.key && (
                        <ArrowUpDown className="w-3 h-3 text-gray-300" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingPaiements ? (
                <tr>
                  <td colSpan={9} className="px-0 py-0">
                    <SkeletonTable rows={5} cols={9} />
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-gray-500 font-medium">Aucun paiement trouvé</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.flatMap((p) => {
                  const Icon = typeIcons[p.type_paiement] || Banknote;
                  const isExpanded = expandedId === p.id;
                  const isDeleted = !!p.deleted_at;
                  const row = (
                    <tr key={p.id} className={`table-row ${isDeleted ? 'bg-red-50/60' : ''}`}>
                      <td className={`px-5 py-4 font-medium ${isDeleted ? 'text-red-400 line-through decoration-red-400' : 'text-gray-700'}`}>{formatDate(p.date_paiement)}</td>
                      <td className="px-5 py-4">
                        <span className={`font-mono text-xs font-semibold px-2 py-1 rounded-md ${isDeleted ? 'text-red-400 bg-red-50 line-through decoration-red-400' : 'text-jeta-blue bg-jeta-blue/5'}`}>
                          {p.code_paiement || '—'}
                        </span>
                        {isDeleted && (
                          <span className="badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200 text-[10px] ml-2">Supprimé</span>
                        )}
                        {!isDeleted && p.validation_status === 'en_attente' && (
                          <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px] ml-2">En attente</span>
                        )}
                      </td>
                      <td className={`px-5 py-4 ${isDeleted ? 'text-red-400 line-through decoration-red-400' : ''}`}>
                        <span className="font-semibold">{p.filiale.nom}</span>
                      </td>
                      <td className={`px-5 py-4 ${isDeleted ? 'text-red-400 line-through decoration-red-400' : 'text-gray-700'}`}>
                        {p.filiale_receptrice ? (
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowLeftRight className="w-3 h-3" />
                            <span>{p.filiale_receptrice.nom}</span>
                            <span className="text-xs ml-1">(interne)</span>
                          </span>
                        ) : (
                          p.fournisseur?.nom || '—'
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={isDeleted ? 'badge bg-red-50 text-red-400 border-red-200 line-through decoration-red-400' : (typeBadgeStyles[p.type_paiement] || 'badge badge-gray')}>
                          <Icon className="w-3 h-3" />
                          {p.type_paiement}
                        </span>
                      </td>
                      <td className={`px-5 py-4 text-right whitespace-nowrap ${isDeleted ? 'text-red-400 line-through decoration-red-400' : ''}`}>
                        <span className="font-bold">{formatCurrency(p.montant)}</span>
                      </td>
                      <td className={`px-5 py-4 text-xs font-mono ${isDeleted ? 'text-red-400 line-through decoration-red-400' : 'text-gray-500'}`}>
                        {p.reference || '—'}
                      </td>
                      <td className="px-5 py-4">
                        {isDeleted ? (
                          <span className="badge bg-red-50 text-red-400 border-red-200">Supprimé</span>
                        ) : (
                          <span className={statutBadgeStyles[p.statut] || 'badge badge-gray'}>
                            {p.statut}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1">
                          {isDeleted ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(p.id); }}
                              className="p-2 text-gray-400 hover:text-jeta-green hover:bg-green-50 rounded-lg transition-colors"
                              title="Restaurer"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : p.id); }}
                                className={`p-2 rounded-lg transition-colors ${isExpanded ? 'text-jeta-blue bg-jeta-blue/5' : 'text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5'}`}
                                title="Détails"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const { generatePaymentReceipt } = await import('../lib/generateReceipt');
                                  generatePaymentReceipt({
                                    code_paiement: p.code_paiement || '',
                                    date_paiement: p.date_paiement,
                                    filiale_nom: p.filiale.nom,
                                    filiale_code: p.filiale.code || '',
                                    beneficiaire_nom: p.filiale_receptrice ? p.filiale_receptrice.nom + ' (interne)' : (p.fournisseur?.nom || '—'),
                                    type_paiement: p.type_paiement,
                                    montant: p.montant,
                                    reference: p.reference,
                                    statut: p.statut,
                                    banque_nom: p.compte_bancaire?.banque?.nom || null,
                                    rib: p.compte_bancaire?.numero_compte || null,
                                    notes: p.notes,
                                  });
                                }}
                                className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
                                title="Imprimer le reçu"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {hasPerm('paiements', 'edit') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDuplicate(p); }}
                                  className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
                                  title="Dupliquer"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>
                              )}
                              {hasPerm('paiements', 'edit') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                                  className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {hasPerm('paiements', 'delete') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeletingId(p.id); }}
                                  className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  const detail = isExpanded ? (
                    <tr key={`${p.id}-detail`} className="bg-gray-50/80">
                      <td colSpan={9} className="px-5 py-4 animate-slide-down">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Dates
                            </p>
                            <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-1">
                              <p className="text-sm"><span className="text-gray-500">Paiement :</span> <span className="font-semibold">{formatDate(p.date_paiement)}</span></p>
                              <p className="text-sm"><span className="text-gray-500">Création :</span> <span className="font-semibold">{formatDate(p.created_at || p.date_paiement)}</span></p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Bénéficiaire
                            </p>
                            <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-1">
                              <p className="text-sm font-semibold">
                                {p.filiale_receptrice ? p.filiale_receptrice.nom : (p.fournisseur?.nom || '—')}
                              </p>
                              {p.compte_bancaire?.banque && (
                                <p className="text-xs text-gray-500">
                                  {p.compte_bancaire.banque.nom}
                                  {p.compte_bancaire.numero_compte && ` — ${p.compte_bancaire.numero_compte.slice(0, 5)}...`}
                                </p>
                              )}
                              {p.notes && <p className="text-xs text-gray-500 mt-1 italic">{p.notes}</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Info className="w-3 h-3" /> Informations
                            </p>
                            <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-1">
                              <p className="text-sm"><span className="text-gray-500">Code :</span> <span className="font-mono font-semibold">{p.code_paiement || '—'}</span></p>
                              <p className="text-sm"><span className="text-gray-500">Réf. :</span> <span className="font-mono">{p.reference || '—'}</span></p>
                              <p className="text-sm"><span className="text-gray-500">Filiale :</span> <span className="font-semibold">{p.filiale.nom}</span></p>
                              {p.paiement_factures?.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Factures lettrées</p>
                                  {p.paiement_factures.map((pf) => (
                                    <p key={pf.id} className="text-xs text-gray-600 flex items-center gap-1">
                                      <span className="font-mono text-purple-700">{pf.facture?.code_facture || '—'}</span>
                                      {pf.code_lettrage && (
                                        <span className="text-gray-400">· LET: {pf.code_lettrage}</span>
                                      )}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null;
                  return detail ? [row, detail] : [row];
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-600">
              Page <span className="font-semibold text-gray-900">{page + 1}</span> sur <span className="font-semibold text-gray-900">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page === totalPages - 1}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <PaiementForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
          paiement={editingPaiement}
          duplicateFrom={duplicatingPaiement}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Supprimer le paiement"
        message="Ce paiement sera masqué et n'impactera plus le solde. Il pourra être restauré ultérieurement."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
        secondConfirmLabel={role === 'admin' ? 'Supprimer définitivement' : undefined}
        onSecondConfirm={role === 'admin' ? handleHardDelete : undefined}
      />

      {showImport && (
        <ImportPaiementsModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); refresh(); }}
        />
      )}
    </div>
  );
}
