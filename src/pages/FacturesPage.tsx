import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFactures, useFournisseurs, useFilialles, useZonesGeographiques, useChantiers, useLocalisations } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatCurrency, formatDate } from '../lib/utils';
import { Plus, FileText, Pencil, Trash2, X, Save, Loader2, Search, Calendar, Building2, Hash, CheckCircle, Clock, AlertTriangle, Ban, ReceiptText, Banknote, MapPin as MapPinIcon, HardHat as HardHatIcon, ChevronRight } from 'lucide-react';
import { PaiementForm } from '../components/PaiementForm';
import type { Facture } from '../types';
import type { FactureFetched } from '../hooks/useData';
import type { FactureInsert } from '../types/database';
import { useAuth } from '../context/AuthContext';

const statutBadgeStyles: Record<string, string> = {
  'Impayée': 'badge bg-gradient-to-r from-red-100 to-red-50 text-red-700 border-red-200',
  'Partiellement payée': 'badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200',
  'Payée': 'badge bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border-emerald-200',
  'Annulée': 'badge bg-gradient-to-r from-gray-100 to-gray-50 text-gray-600 border-gray-200',
};

const statutIcons: Record<string, React.ElementType> = {
  'Impayée': AlertTriangle,
  'Partiellement payée': Clock,
  'Payée': CheckCircle,
  'Annulée': Ban,
};



interface FactureFormProps {
  onClose: () => void;
  onSaved: () => void;
  facture?: FactureFetched | null;
}

function FactureForm({ onClose, onSaved, facture }: FactureFormProps) {
  const toast = useToast();
  const { data: fournisseurs } = useFournisseurs();
  const { data: filiales } = useFilialles();
  const { data: zones } = useZonesGeographiques();
  const { data: localisations } = useLocalisations();
  const { data: chantiers } = useChantiers();
  const [saving, setSaving] = useState(false);
  const chantierInitial = facture?.chantier;
  const [form, setForm] = useState({
    code_facture: facture?.code_facture || '',
    fournisseur_id: facture?.fournisseur_id || '',
    filiale_id: facture?.filiale_id || '',
    province_id: chantierInitial?.localisation?.zone?.id || '',
    localisation_id: chantierInitial?.localisation?.id || '',
    chantier_id: chantierInitial?.id || '',
    date_facture: facture?.date_facture || new Date().toISOString().split('T')[0],
    date_echeance: facture?.date_echeance || '',
    montant: facture ? String(facture.montant) : '',
    montant_ht: facture?.montant_ht ? String(facture.montant_ht) : '',
    tva: facture?.tva ? String(facture.tva) : '',
    taxes: facture?.taxes ? String(facture.taxes) : '',
    reference: facture?.reference || '',
    notes: facture?.notes || '',
    statut: facture?.statut || 'Impayée',
  });

  const filteredLocalisations = localisations.filter((l) => l.zone_id === form.province_id);
  const filteredChantiers = chantiers.filter((c) => c.localisation_id === form.localisation_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fournisseur_id || !form.date_facture || !form.date_echeance || !form.montant || isNaN(parseFloat(form.montant))) {
      toast.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    const payload: FactureInsert = {
      code_facture: form.code_facture,
      fournisseur_id: form.fournisseur_id,
      filiale_id: form.filiale_id || null,
      chantier_id: form.chantier_id || null,
      date_facture: form.date_facture,
      date_echeance: form.date_echeance,
      montant: parseFloat(form.montant),
      montant_ht: form.montant_ht ? parseFloat(form.montant_ht) : null,
      tva: form.tva ? parseFloat(form.tva) : null,
      taxes: form.taxes ? parseFloat(form.taxes) : null,
      reference: form.reference || null,
      notes: form.notes || null,
      statut: form.statut,
    };
    if (facture) {
      payload.montant_paye = facture.montant_paye;
    }
    const op = facture
      ? supabase.from('factures').update(payload).eq('id', facture.id)
      : supabase.from('factures').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(facture ? 'Facture mise à jour' : 'Facture créée');
      onSaved();
    }
  };

  useEffect(() => {
    if (!facture) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
      setForm((prev) => ({ ...prev, code_facture: `FAC-${y}${m}${d}-${seq}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {facture ? 'Modifier la Facture' : 'Nouvelle Facture'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Hash className="w-4 h-4 text-gray-400" />
                Code Facture
              </label>
              <input
                required
                readOnly={!facture}
                value={form.code_facture}
                onChange={(e) => setForm({ ...form, code_facture: e.target.value })}
                className={`input-field font-mono text-sm ${!facture ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="FAC-20260701-0001"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Building2 className="w-4 h-4 text-gray-400" />
                Fournisseur
              </label>
              <select
                required
                value={form.fournisseur_id}
                onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })}
                className="select-field"
              >
                <option value="">Sélectionner...</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Building2 className="w-4 h-4 text-gray-400" />
                Filiale
              </label>
              <select
                value={form.filiale_id}
                onChange={(e) => setForm({ ...form, filiale_id: e.target.value })}
                className="select-field"
              >
                <option value="">Sélectionner...</option>
                {filiales.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <MapPinIcon className="w-4 h-4 text-gray-400" />
                Province
              </label>
              <select value={form.province_id} onChange={(e) => setForm({ ...form, province_id: e.target.value, localisation_id: '', chantier_id: '' })} className="select-field">
                <option value="">Sélectionner...</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <MapPinIcon className="w-4 h-4 text-gray-400" />
                Localisation
              </label>
              <select value={form.localisation_id} onChange={(e) => setForm({ ...form, localisation_id: e.target.value, chantier_id: '' })} className="select-field" disabled={!form.province_id}>
                <option value="">Sélectionner...</option>
                {filteredLocalisations.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <HardHatIcon className="w-4 h-4 text-gray-400" />
                Projet
              </label>
              <select value={form.chantier_id} onChange={(e) => setForm({ ...form, chantier_id: e.target.value })} className="select-field" disabled={!form.localisation_id}>
                <option value="">Sélectionner...</option>
                {filteredChantiers.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Date Facture
              </label>
              <input
                type="date"
                required
                value={form.date_facture}
                onChange={(e) => setForm({ ...form, date_facture: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Date Échéance
              </label>
              <input
                type="date"
                required
                value={form.date_echeance}
                onChange={(e) => setForm({ ...form, date_echeance: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <ReceiptText className="w-4 h-4 text-gray-400" />
                Montant HT
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.montant_ht}
                onChange={(e) => setForm({ ...form, montant_ht: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <ReceiptText className="w-4 h-4 text-gray-400" />
                TVA
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.tva}
                onChange={(e) => setForm({ ...form, tva: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <ReceiptText className="w-4 h-4 text-gray-400" />
                Taxes
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.taxes}
                onChange={(e) => setForm({ ...form, taxes: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                Montant TTC
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={form.montant}
                onChange={(e) => setForm({ ...form, montant: e.target.value })}
                className="input-field"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <CheckCircle className="w-4 h-4 text-gray-400" />
                Statut
              </label>
              <select
                required
                value={form.statut}
                onChange={(e) => setForm({ ...form, statut: e.target.value })}
                className="select-field"
              >
                <option value="Impayée">Impayée</option>
                <option value="Partiellement payée">Partiellement payée</option>
                <option value="Payée">Payée</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
              <Hash className="w-4 h-4 text-gray-400" />
              Référence fournisseur
            </label>
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="input-field"
              placeholder="Référence externe (optionnelle)"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field resize-none"
              placeholder="Notes optionnelles..."
            />
          </div>
          <div className="flex gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {facture ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FacturesPage() {
  const { data: factures, loading, refresh } = useFactures();
  const toast = useToast();
  const { hasPerm } = useAuth();

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const onFacturesUpdated = () => refresh();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('factures-updated', onFacturesUpdated);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('factures-updated', onFacturesUpdated);
    };
  }, [refresh]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FactureFetched | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingFacture, setPayingFacture] = useState<Facture | null>(null);
  const [statutFilter, setStatutFilter] = useState('');
  const [groupByHierarchy, setGroupByHierarchy] = useState(false);
  const [expandedProvinces, setExpandedProvinces] = useState<Set<string>>(new Set());
  const [expandedLocalisations, setExpandedLocalisations] = useState<Set<string>>(new Set());

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(value); }, 300);
  }, []);

  const filtered = useMemo(() => {
    let r = factures;
    const s = search.toLowerCase();
    if (s) {
      r = r.filter((f) =>
        f.code_facture.toLowerCase().includes(s) ||
        f.fournisseur.nom.toLowerCase().includes(s) ||
        (f.reference || '').toLowerCase().includes(s)
      );
    }
    if (statutFilter) {
      r = r.filter((f) => f.statut === statutFilter);
    }
    return r;
  }, [factures, search, statutFilter]);

  const tree = useMemo(() => {
    type TreeEntry = {
      provinceId: string;
      provinceNom: string;
      localisations: {
        localisationId: string;
        localisationNom: string;
        chantiers: {
          chantierId: string;
          chantierNom: string;
          factures: typeof factures;
        }[];
      }[];
    };

    const map = new Map<string, TreeEntry>();
    for (const f of filtered) {
      const provId = f.chantier?.localisation?.zone?.id || '__none__';
      const provNom = f.chantier?.localisation?.zone?.nom || 'Sans province';
      const locId = f.chantier?.localisation?.id || '__none__';
      const locNom = f.chantier?.localisation?.nom || 'Sans localisation';
      const chId = f.chantier?.id || '__none__';
      const chNom = f.chantier?.nom || 'Sans projet';

      if (!map.has(provId)) {
        map.set(provId, { provinceId: provId, provinceNom: provNom, localisations: [] });
      }
      const prov = map.get(provId)!;

      let locEntry = prov.localisations.find(l => l.localisationId === locId);
      if (!locEntry) {
        locEntry = { localisationId: locId, localisationNom: locNom, chantiers: [] };
        prov.localisations.push(locEntry);
      }

      let chEntry = locEntry.chantiers.find(c => c.chantierId === chId);
      if (!chEntry) {
        chEntry = { chantierId: chId, chantierNom: chNom, factures: [] };
        locEntry.chantiers.push(chEntry);
      }

      chEntry.factures.push(f);
    }

    return Array.from(map.values());
  }, [filtered]);

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('factures').delete().eq('id', deletingId);
    if (error) toast.error('Erreur lors de la suppression');
    else toast.success('Facture supprimée');
    setDeletingId(null);
    refresh();
  };

  const [checkingEdit, setCheckingEdit] = useState<string | null>(null);

  const handleEditClick = async (f: FactureFetched) => {
    setCheckingEdit(f.id);
    const { count } = await supabase
      .from('paiement_factures')
      .select('id', { count: 'exact', head: true })
      .eq('facture_id', f.id);
    if (count && count > 0) {
      toast.error('Cette facture est liée à un paiement. Supprimez le lettrage pour pouvoir la modifier.');
      setCheckingEdit(null);
      return;
    }
    setEditing(f);
    setShowForm(true);
    setCheckingEdit(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Factures</h2>
            <p className="text-sm text-gray-500">{filtered.length} facture{filtered.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        {hasPerm('factures', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouvelle Facture
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              className="select-field w-auto"
            >
              <option value="">Tous statuts</option>
              <option value="Impayée">Impayée</option>
              <option value="Partiellement payée">Partiellement payée</option>
              <option value="Payée">Payée</option>
              <option value="Annulée">Annulée</option>
            </select>
            <button
              onClick={() => setGroupByHierarchy(!groupByHierarchy)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${groupByHierarchy ? 'bg-jeta-blue text-white border-jeta-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-jeta-blue hover:text-jeta-blue'}`}
            >
              {groupByHierarchy ? 'Vue normale' : 'Regrouper par projet'}
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {filtered.length} facture{filtered.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Code</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Fournisseur</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Filiale</th>

                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Échéance</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Montant</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Payé</th>
                <th className="text-right px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Restant</th>
                <th className="text-left px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-40">Statut</th>
                <th className="text-center px-5 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10}><SkeletonTable rows={5} cols={10} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-gray-500 font-medium">Aucune facture trouvée</span>
                    </div>
                  </td>
                </tr>
              ) : groupByHierarchy ? (
                tree.flatMap((prov) => {
                  const provExpanded = expandedProvinces.has(prov.provinceId);
                  const rows: JSX.Element[] = [];
                  const totalProvFactures = prov.localisations.reduce((s, l) => s + l.chantiers.reduce((s2, c) => s2 + c.factures.length, 0), 0);

                  rows.push(
                    <tr key={`prov-${prov.provinceId}`} className="bg-gradient-to-r from-blue-50/80 to-gray-50/80 border-b border-blue-100 cursor-pointer hover:bg-blue-100/30 transition-colors" onClick={() => setExpandedProvinces(prev => { const n = new Set(prev); if (n.has(prov.provinceId)) n.delete(prov.provinceId); else n.add(prov.provinceId); return n; })}>
                      <td colSpan={10} className="px-5 py-2.5">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-4 h-4 text-blue-600 transition-transform ${provExpanded ? 'rotate-90' : ''}`} />
                          <MapPinIcon className="w-4 h-4 text-blue-500" />
                          <span className="font-bold text-blue-800">{prov.provinceNom}</span>
                          <span className="text-xs text-blue-500 font-semibold">({totalProvFactures} facture{totalProvFactures > 1 ? 's' : ''})</span>
                        </div>
                      </td>
                    </tr>
                  );

                  if (provExpanded) {
                    for (const loc of prov.localisations) {
                      const locExpanded = expandedLocalisations.has(loc.localisationId);
                      const totalLocFactures = loc.chantiers.reduce((s, c) => s + c.factures.length, 0);

                      rows.push(
                        <tr key={`loc-${loc.localisationId}`} className="bg-blue-50/30 border-b border-blue-100 cursor-pointer hover:bg-blue-100/20 transition-colors" onClick={() => setExpandedLocalisations(prev => { const n = new Set(prev); if (n.has(loc.localisationId)) n.delete(loc.localisationId); else n.add(loc.localisationId); return n; })}>
                          <td colSpan={10} className="px-5 py-2 pl-14">
                            <div className="flex items-center gap-2">
                              <ChevronRight className={`w-3.5 h-3.5 text-blue-500 transition-transform ${locExpanded ? 'rotate-90' : ''}`} />
                              <span className="font-semibold text-blue-700">{loc.localisationNom}</span>
                              <span className="text-xs text-blue-400">({totalLocFactures} facture{totalLocFactures > 1 ? 's' : ''})</span>
                            </div>
                          </td>
                        </tr>
                      );

                      if (locExpanded) {
                        for (const ch of loc.chantiers) {
                          const chExpanded = expandedLocalisations.has(`ch-${ch.chantierId}`);

                          rows.push(
                            <tr key={`ch-${ch.chantierId}`} className="bg-white/50 border-b border-gray-100 cursor-pointer hover:bg-gray-100/30 transition-colors" onClick={() => setExpandedLocalisations(prev => { const n = new Set(prev); if (n.has(`ch-${ch.chantierId}`)) n.delete(`ch-${ch.chantierId}`); else n.add(`ch-${ch.chantierId}`); return n; })}>
                              <td colSpan={10} className="px-5 py-1.5 pl-24">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className={`w-3 h-3 text-amber-500 transition-transform ${chExpanded ? 'rotate-90' : ''}`} />
                                  <HardHatIcon className="w-3.5 h-3.5 text-amber-500" />
                                  <span className="font-medium text-gray-700">{ch.chantierNom}</span>
                                  <span className="text-xs text-gray-400">({ch.factures.length} facture{ch.factures.length > 1 ? 's' : ''})</span>
                                </div>
                              </td>
                            </tr>
                          );

                          if (chExpanded) {
                            for (const f of ch.factures) {
                              const reste = f.montant - f.montant_paye;
                              const ratio = f.montant > 0 ? (f.montant_paye / f.montant) * 100 : 0;
                              const StatutIcon = statutIcons[f.statut] || FileText;
                              rows.push(
                                <tr key={f.id} className="table-row bg-white">
                                  <td className="px-5 py-3 pl-32">
                                    <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                                      {f.code_facture}
                                    </span>
                                    {f.validation_status === 'en_attente' && (
                                      <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px] ml-2">En attente</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 font-semibold text-gray-900">{f.fournisseur.nom}</td>
                                  <td className="px-5 py-3 text-gray-600">
                                    {f.filiale ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                        {f.filiale.nom}
                                      </span>
                                    ) : <span className="text-gray-400 italic">—</span>}
                                  </td>
                                  <td className="px-5 py-3 text-gray-700">{formatDate(f.date_facture)}</td>
                                  <td className="px-5 py-3 text-gray-700">{formatDate(f.date_echeance)}</td>
                                  <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(f.montant)}</td>
                                  <td className="px-5 py-3 text-right text-emerald-600 font-semibold whitespace-nowrap">{formatCurrency(f.montant_paye)}</td>
                                  <td className="px-5 py-3 text-right whitespace-nowrap">
                                    <span className={`font-bold ${reste > 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>{formatCurrency(reste)}</span>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className={`${statutBadgeStyles[f.statut] || 'badge badge-gray'} inline-flex items-center gap-1 text-xs`}>
                                        <StatutIcon className="w-3 h-3" />
                                        {f.statut}
                                      </span>
                                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <div className={`h-full rounded-full transition-all ${ratio >= 100 ? 'bg-emerald-500' : ratio > 0 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-5 py-3">
                                    <div className="flex items-center justify-center gap-1">
                                      {hasPerm('factures', 'edit') && f.statut !== 'Payée' && f.statut !== 'Annulée' && (
                                        <button onClick={() => setPayingFacture(f)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Payer">
                                          <Banknote className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {hasPerm('factures', 'edit') && (
                                        <button onClick={() => handleEditClick(f)} disabled={checkingEdit === f.id} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40" title="Modifier">
                                          {checkingEdit === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                                        </button>
                                      )}
                                      {hasPerm('factures', 'delete') && (
                                        <button onClick={() => setDeletingId(f.id)} className="p-1.5 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors" title="Supprimer">
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          }
                        }
                      }
                    }
                  }

                  return rows;
                })
              ) : (
                filtered.map((f) => {
                  const reste = f.montant - f.montant_paye;
                  const ratio = f.montant > 0 ? (f.montant_paye / f.montant) * 100 : 0;
                  const StatutIcon = statutIcons[f.statut] || FileText;
                  return (
                    <tr key={f.id} className="table-row bg-white">
                      <td className="px-5 py-3">
                        <span className="font-mono text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">
                          {f.code_facture}
                        </span>
                        {f.validation_status === 'en_attente' && (
                          <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px] ml-2">En attente</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-semibold text-gray-900">{f.fournisseur.nom}</td>
                      <td className="px-5 py-3 text-gray-600">
                        {f.filiale ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            {f.filiale.nom}
                          </span>
                        ) : <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{formatDate(f.date_facture)}</td>
                      <td className="px-5 py-3 text-gray-700">{formatDate(f.date_echeance)}</td>
                      <td className="px-5 py-3 text-right font-bold text-gray-900 whitespace-nowrap">{formatCurrency(f.montant)}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-semibold whitespace-nowrap">{formatCurrency(f.montant_paye)}</td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <span className={`font-bold ${reste > 0 ? 'text-jeta-red' : 'text-emerald-600'}`}>{formatCurrency(reste)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`${statutBadgeStyles[f.statut] || 'badge badge-gray'} inline-flex items-center gap-1 text-xs`}>
                            <StatutIcon className="w-3 h-3" />
                            {f.statut}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${ratio >= 100 ? 'bg-emerald-500' : ratio > 0 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${Math.min(ratio, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {hasPerm('factures', 'edit') && f.statut !== 'Payée' && f.statut !== 'Annulée' && (
                            <button onClick={() => setPayingFacture(f)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Payer">
                              <Banknote className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hasPerm('factures', 'edit') && (
                            <button onClick={() => handleEditClick(f)} disabled={checkingEdit === f.id} className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-40" title="Modifier">
                              {checkingEdit === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {hasPerm('factures', 'delete') && (
                            <button onClick={() => setDeletingId(f.id)} className="p-1.5 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors" title="Supprimer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <FactureForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
          facture={editing}
        />
      )}

      {payingFacture && (
        <PaiementForm
          onClose={() => setPayingFacture(null)}
          onSaved={() => { setPayingFacture(null); refresh(); }}
          prefillFactureId={payingFacture.id}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Supprimer la facture"
        message="Les paiements liés à cette facture ne seront pas supprimés mais perdront leur liaison. Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
