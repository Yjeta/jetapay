import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalisations, useZonesGeographiques } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { Plus, MapPin, Pencil, Trash2, X, Save, Loader2, Globe, ShieldCheck } from 'lucide-react';
import type { Localisation } from '../types';
import { useAuth } from '../context/AuthContext';

function LocalisationForm({ onClose, onSaved, localisation }: { onClose: () => void; onSaved: () => void; localisation?: Localisation | null }) {
  const toast = useToast();
  const { data: zones } = useZonesGeographiques();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: localisation?.nom || '',
    zone_id: localisation?.zone_id || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.zone_id) return;
    setSaving(true);
    const payload = { nom: form.nom.trim(), zone_id: form.zone_id };
    const op = localisation
      ? supabase.from('localisations').update(payload).eq('id', localisation.id)
      : supabase.from('localisations').insert(payload);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(localisation ? 'Localisation mise à jour' : 'Localisation créée');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {localisation ? 'Modifier la Localisation' : 'Nouvelle Localisation'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Province</label>
            <select required value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} className="select-field">
              <option value="">Sélectionner...</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom de la localisation</label>
            <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="input-field" placeholder="Ville, quartier…" />
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {localisation ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LocalisationsPage() {
  const { data: localisations, loading, refresh } = useLocalisations();
  const toast = useToast();
  const { hasPerm } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Localisation | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounced(value), 300);
  }, []);

  const filtered = localisations.filter((l) => {
    const s = searchDebounced.toLowerCase();
    return !s || l.nom.toLowerCase().includes(s) || l.zone?.nom.toLowerCase().includes(s);
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    const { count, error: countErr } = await supabase.from('chantiers').select('id', { count: 'exact', head: true }).eq('localisation_id', deletingId);
    if (countErr) { toast.error('Erreur lors de la vérification des liaisons'); setDeletingId(null); return; }
    if (count && count > 0) {
      toast.error(`Suppression impossible : ${count} chantier(s) sont liés à cette localisation`);
      setDeletingId(null);
      return;
    }
    const { error } = await supabase.from('localisations').delete().eq('id', deletingId);
    if (error) toast.error('Erreur lors de la suppression');
    else toast.success('Localisation supprimée');
    setDeletingId(null);
    refresh();
  };

  if (!hasPerm('localisations', 'view')) {
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
          <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Localisations</h2>
            <p className="text-sm text-gray-500">Villes et zones rattachées aux provinces</p>
          </div>
        </div>
        {hasPerm('localisations', 'create') && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nouvelle Localisation
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Rechercher une localisation par nom ou province..." defaultValue="" onChange={(e) => handleSearch(e.target.value)} className="input-field pl-12 text-base" />
      </div>

      {loading ? (
        <SkeletonGrid cards={6} />
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Aucune localisation trouvée</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez-en une ou modifiez votre recherche</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-teal-50/50 to-white border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Localisation</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Province</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l) => (
                <tr key={l.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-teal-500/20 to-teal-500/10 rounded-xl flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-teal-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{l.nom}</span>
                      {l.validation_status === 'en_attente' && (
                        <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px]">En attente</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {l.zone?.nom || <span className="text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPerm('localisations', 'edit') && (
                        <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {hasPerm('localisations', 'delete') && (
                        <button onClick={() => setDeletingId(l.id)} className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors">
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
        <LocalisationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); refresh(); }} localisation={editing} />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Supprimer la localisation"
        message="Êtes-vous sûr de vouloir supprimer cette localisation ?"
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
