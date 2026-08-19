import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useChantiers, useLocalisations, useZonesGeographiques } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { Plus, HardHat, Pencil, Trash2, X, Save, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import type { Chantier, Localisation, ZoneGeographique } from '../types';
import type { ChantierInsert, ChantierUpdate } from '../types/database';
import { useAuth } from '../context/AuthContext';

type ChantierWithRelations = Chantier & {
  localisation?: (Localisation & { zone?: ZoneGeographique }) | null;
  validation_status?: string | null;
};

function ChantierForm({ onClose, onSaved, chantier }: { onClose: () => void; onSaved: () => void; chantier?: ChantierWithRelations | null }) {
  const toast = useToast();
  const { data: zones } = useZonesGeographiques();
  const { data: localisations } = useLocalisations();
  const chantierLocalisation = chantier?.localisation;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: chantier?.nom || '',
    code: chantier?.code || '',
    province_id: chantierLocalisation?.zone?.id || '',
    localisation_id: chantierLocalisation?.id || '',
  });

  const filteredLocalisations = localisations.filter((l) => l.zone_id === form.province_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.code.trim()) return;
    setSaving(true);
    const payload: ChantierInsert = { nom: form.nom.trim(), code: form.code.trim() };
    if (form.localisation_id) payload.localisation_id = form.localisation_id;
    const op = chantier
      ? supabase.from('chantiers').update(payload as ChantierUpdate).eq('id', chantier.id)
      : supabase.from('chantiers').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(chantier ? 'Chantier mis à jour' : 'Chantier créé');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {chantier ? 'Modifier le Chantier' : 'Nouveau Chantier'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom du chantier</label>
            <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input-field" placeholder="Ex: Projet A, Site B..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code</label>
            <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field font-mono" placeholder="Ex: CH-001" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Province</label>
            <select value={form.province_id} onChange={(e) => setForm({ ...form, province_id: e.target.value, localisation_id: '' })} className="select-field">
              <option value="">Sélectionner...</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Localisation</label>
            <select value={form.localisation_id} onChange={(e) => setForm({ ...form, localisation_id: e.target.value })} className="select-field" disabled={!form.province_id}>
              <option value="">Sélectionner...</option>
              {filteredLocalisations.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {chantier ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ChantiersPage() {
  const { data: chantiers, loading, refresh } = useChantiers();
  const toast = useToast();
  const { hasPerm } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChantierWithRelations | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounced(value), 300);
  }, []);

  const filtered = chantiers.filter((c) => {
    const s = searchDebounced.toLowerCase();
    return !s || c.nom.toLowerCase().includes(s) || c.code.toLowerCase().includes(s);
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    const { count, error: countErr } = await supabase.from('factures').select('id', { count: 'exact', head: true }).eq('chantier_id', deletingId);
    if (countErr) { toast.error('Erreur lors de la vérification des liaisons'); setDeletingId(null); return; }
    if (count && count > 0) {
      toast.error(`Suppression impossible : ${count} facture(s) sont liées à ce chantier`);
      setDeletingId(null);
      return;
    }
    const { error } = await supabase.from('chantiers').delete().eq('id', deletingId);
    if (error) toast.error('Erreur lors de la suppression');
    else toast.success('Chantier supprimé');
    setDeletingId(null);
    refresh();
  };

  if (!hasPerm('chantiers', 'view')) {
    return (
      <div className="card py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Accès non autorisé à ce module.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chantiers</h2>
            <p className="text-sm text-gray-500">Gestion des chantiers et projets</p>
          </div>
        </div>
        {hasPerm('chantiers', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouveau Chantier
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input type="text" placeholder="Rechercher un chantier par nom ou code..." defaultValue="" onChange={(e) => handleSearch(e.target.value)} className="input-field pl-12 text-base" />
      </div>

      {loading ? (
        <SkeletonGrid cards={6} />
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <HardHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Aucun chantier trouvé</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez-en un ou modifiez votre recherche</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-amber-50/50 to-white border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Chantier</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Code</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Province</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Localisation</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <tr key={c.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center">
                        <HardHat className="w-4 h-4 text-amber-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{c.nom}</span>
                      {c.validation_status === 'en_attente' && (
                        <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px]">En attente</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">{c.code}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.localisation?.zone ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        {c.localisation.zone.nom}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.localisation?.nom || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPerm('chantiers', 'edit') && (
                        <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {hasPerm('chantiers', 'delete') && (
                        <button onClick={() => setDeletingId(c.id)} className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ChantierForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} chantier={editing} />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Supprimer le chantier"
        message="Êtes-vous sûr de vouloir supprimer ce chantier ?"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
