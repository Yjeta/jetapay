import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useBeneficiaires } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { formatRIB } from '../lib/utils';
import { Plus, BookOpen, Pencil, Trash2, X, Save, Loader2, Landmark, Copy, CheckCircle } from 'lucide-react';
import type { Beneficiaire } from '../types';
import type { BeneficiaireInsert, BeneficiaireUpdate } from '../types/database';
import { useAuth } from '../context/AuthContext';

interface BeneficiaireFormProps {
  onClose: () => void;
  onSaved: () => void;
  beneficiaire?: Beneficiaire | null;
}

function BeneficiaireForm({ onClose, onSaved, beneficiaire }: BeneficiaireFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: beneficiaire?.nom || '',
    rib: beneficiaire?.rib || '',
    banque_nom: beneficiaire?.banque_nom || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const op = beneficiaire
      ? supabase.from('beneficiaires').update(form as BeneficiaireUpdate).eq('id', beneficiaire.id)
      : supabase.from('beneficiaires').insert(form as BeneficiaireInsert);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(beneficiaire ? 'Bénéficiaire mis à jour' : 'Bénéficiaire créé');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {beneficiaire ? 'Modifier le Bénéficiaire' : 'Nouveau Bénéficiaire'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="input-field"
              placeholder="Nom du bénéficiaire"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">RIB</label>
            <input
              required
              value={form.rib}
              onChange={(e) => setForm({ ...form, rib: e.target.value })}
              className="input-field font-mono"
              placeholder="XXXXX XXXXX XXXXXXXXXXX XX"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banque</label>
            <input
              required
              value={form.banque_nom}
              onChange={(e) => setForm({ ...form, banque_nom: e.target.value })}
              className="input-field"
              placeholder="Nom de la banque"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {beneficiaire ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BeneficiairesPage() {
  const { data: beneficiaires, loading, refresh } = useBeneficiaires();
  const toast = useToast();
  const { hasPerm } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingBeneficiaire, setEditingBeneficiaire] = useState<Beneficiaire | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchDebounced(value);
    }, 300);
  }, []);

  const filtered = beneficiaires.filter((b) => {
    const s = searchDebounced.toLowerCase();
    return !s || b.nom.toLowerCase().includes(s) || b.banque_nom.toLowerCase().includes(s) || b.rib.replace(/[\s-]/g, '').includes(s.replace(/[\s-]/g, ''));
  });

  const handleDelete = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from('beneficiaires').delete().eq('id', deletingId);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Bénéficiaire supprimé');
    }
    setDeletingId(null);
    refresh();
  };

  const copyRIB = async (rib: string, id: string) => {
    try {
      await navigator.clipboard.writeText(rib);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Impossible de copier');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bénéficiaires</h2>
            <p className="text-sm text-gray-500">Liste des bénéficiaires et leurs coordonnées bancaires</p>
          </div>
        </div>
        {hasPerm('beneficiaires', 'create') && (
          <button
            onClick={() => { setEditingBeneficiaire(null); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nouveau Bénéficiaire
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un bénéficiaire par nom, banque ou RIB..."
          defaultValue=""
          onChange={(e) => handleSearch(e.target.value)}
          className="input-field pl-12 text-base"
        />
      </div>

      {loading ? (
        <SkeletonGrid cards={6} />
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Aucun bénéficiaire trouvé</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez-en un ou modifiez votre recherche</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50/50 to-white border-b border-gray-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Bénéficiaire</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">RIB</th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Banque</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((b) => (
                <tr key={b.id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-xl flex items-center justify-center">
                        <BookOpen className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="font-semibold text-gray-900">{b.nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-700">{formatRIB(b.rib)}</span>
                      <button
                        onClick={() => copyRIB(b.rib, b.id)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Copier le RIB"
                      >
                        {copiedId === b.id ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{b.banque_nom}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {hasPerm('beneficiaires', 'edit') && (
                        <button
                          onClick={() => { setEditingBeneficiaire(b); setShowForm(true); }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {hasPerm('beneficiaires', 'delete') && (
                        <button
                          onClick={() => setDeletingId(b.id)}
                          className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
                        >
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
        <BeneficiaireForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
          beneficiaire={editingBeneficiaire}
        />
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Supprimer le bénéficiaire"
        message="Êtes-vous sûr de vouloir supprimer ce bénéficiaire ? Cette action est irréversible."
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}

function Search({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
