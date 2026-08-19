import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useFilialles, useBanques, usePaiements } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { validateRIB, formatRIB, formatCurrency, formatDate } from '../lib/utils';
import { Plus, Building2, Pencil, Trash2, Landmark, X, Save, Loader2, ChevronDown, ChevronUp, Search, CheckCircle, XCircle, ReceiptText, Wallet, Calendar, ShieldCheck } from 'lucide-react';
import type { Filiale } from '../types';
import type { FilialeInsert, FilialeUpdate, CompteBancaire, Banque } from '../types/database';
import { useAuth } from '../context/AuthContext';

interface FilialeFormProps {
  onClose: () => void;
  onSaved: () => void;
  filiale?: Filiale | null;
}

function FilialeForm({ onClose, onSaved, filiale }: FilialeFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: filiale?.nom || '',
    code: filiale?.code || '',
    description: filiale?.description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const op = filiale
      ? supabase.from('filiales').update(form as FilialeUpdate).eq('id', filiale.id)
      : supabase.from('filiales').insert(form as FilialeInsert);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(filiale ? 'Filiale mise à jour' : 'Filiale créée');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jeta-green to-jeta-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-green/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {filiale ? 'Modifier la Filiale' : 'Nouvelle Filiale'}
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
              placeholder="Nom de la filiale"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Code</label>
            <input
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="input-field"
              placeholder="Code unique"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none"
              placeholder="Description optionnelle"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-success flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {filiale ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CompteFormProps {
  filialeId: string;
  onClose: () => void;
  onSaved: () => void;
}

function CompteForm({ filialeId, onClose, onSaved }: CompteFormProps) {
  const toast = useToast();
  const { data: banques } = useBanques();
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    banque_id: '',
    numero_compte: '',
    intitule: '',
  });

  const ribValidation = form.numero_compte.replace(/[\s-]/g, '').length === 23 ? validateRIB(form.numero_compte) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (ribValidation !== 'Valide') {
      toast.warning('Le RIB doit être valide (23 chiffres, clé correcte)');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('comptes_bancaires').insert({
      entite_type: 'filiale',
      entite_id: filialeId,
      banque_id: form.banque_id,
      numero_compte: form.numero_compte,
      intitule: form.intitule || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success('Compte bancaire ajouté');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Ajouter un Compte Bancaire</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Banque</label>
            <select
              required
              value={form.banque_id}
              onChange={(e) => setForm({ ...form, banque_id: e.target.value })}
              className={`select-field ${submitted && !form.banque_id ? 'border-red-400 bg-red-50' : ''}`}
            >
              <option value="">Sélectionner...</option>
              {banques.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>
            {submitted && !form.banque_id && <p className="text-xs text-red-500 mt-1">Banque requise</p>}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
              <span>RIB (23 chiffres)</span>
              {ribValidation && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ribValidation === 'Valide' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {ribValidation === 'Valide' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {ribValidation}
                </span>
              )}
            </label>
            <input
              required
              value={form.numero_compte}
              onChange={(e) => setForm({ ...form, numero_compte: e.target.value })}
              className={`input-field font-mono ${submitted && ribValidation !== 'Valide' ? 'border-red-400 bg-red-50' : ribValidation === 'Valide' ? 'border-emerald-400 bg-emerald-50' : ''}`}
              placeholder="XXXXX XXXXX XXXXXXXXXXX XX"
            />
            {submitted && ribValidation !== 'Valide' && <p className="text-xs text-red-500 mt-1">RIB invalide — 23 chiffres requis (code banque 5 + guichet 5 + compte 11 + clé 2)</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Intitulé</label>
            <input
              value={form.intitule}
              onChange={(e) => setForm({ ...form, intitule: e.target.value })}
              className="input-field"
              placeholder="Intitulé optionnel"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FilialesPage() {
  const { data: filiales, loading, refresh } = useFilialles();
  const { data: paiements } = usePaiements();
  const toast = useToast();
  const { hasPerm } = useAuth();
  const canManageFiliales = hasPerm('filiales', 'create') || hasPerm('filiales', 'edit') || hasPerm('filiales', 'delete');

  const paymentStats = useMemo(() => {
    const map = new Map<string, { count: number; montant: number; dernierPaiement: string | null }>();
    for (const p of paiements) {
      if (p.deleted_at) continue;
      const id = p.filiale_id;
      if (!id) continue;
      const existing = map.get(id) || { count: 0, montant: 0, dernierPaiement: null };
      existing.count++;
      existing.montant += p.montant;
      if (!existing.dernierPaiement || p.date_paiement > existing.dernierPaiement) {
        existing.dernierPaiement = p.date_paiement;
      }
      map.set(id, existing);
    }
    return map;
  }, [paiements]);

  const [showForm, setShowForm] = useState(false);
  const [editingFiliale, setEditingFiliale] = useState<Filiale | null>(null);
  const [showCompteForm, setShowCompteForm] = useState<string | null>(null);
  const [expandedFiliale, setExpandedFiliale] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'filiale' | 'compte'; id: string } | null>(null);

  const filtered = filiales.filter((f) => {
    const s = search.toLowerCase();
    return !s || f.nom.toLowerCase().includes(s) || f.code.toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s);
  });

  const handleDelete = async () => {
    if (!deletingTarget) return;
    const { error } = await supabase.from(
      deletingTarget.type === 'filiale' ? 'filiales' : 'comptes_bancaires'
    ).delete().eq('id', deletingTarget.id);
    if (error) {
      toast.error(`Erreur lors de la suppression`);
    } else {
      toast.success(
        deletingTarget.type === 'filiale'
          ? 'Filiale supprimée'
          : 'Compte bancaire supprimé'
      );
    }
    setDeletingTarget(null);
    refresh();
  };

  if (!hasPerm('filiales', 'view')) {
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
          <div className="w-12 h-12 bg-gradient-to-br from-jeta-green to-jeta-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-green/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Filiales</h2>
            <p className="text-sm text-gray-500">Gestion des filiales et de leurs comptes bancaires</p>
          </div>
        </div>
        {canManageFiliales && (
          <button
            onClick={() => { setEditingFiliale(null); setShowForm(true); }}
            className="btn-success"
          >
            <Plus className="w-4 h-4" />
            Nouvelle Filiale
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher une filiale..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-12 text-base"
        />
      </div>

      {loading ? (
        <SkeletonGrid cards={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((f) => {
            const stats = paymentStats.get(f.id);
            return (
              <FilialeCard
                key={f.id}
                filiale={f}
                paymentCount={stats?.count || 0}
                paymentTotal={stats?.montant || 0}
                lastPayment={stats?.dernierPaiement || null}
                canManageFiliales={canManageFiliales}
                onEdit={() => { setEditingFiliale(f); setShowForm(true); }}
                onDelete={() => setDeletingTarget({ type: 'filiale', id: f.id })}
                onAddCompte={() => setShowCompteForm(f.id)}
                onDeleteCompte={(id) => setDeletingTarget({ type: 'compte', id })}
                expanded={expandedFiliale === f.id}
                onToggleExpand={() => setExpandedFiliale(expandedFiliale === f.id ? null : f.id)}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <FilialeForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
          filiale={editingFiliale}
        />
      )}
      {showCompteForm && (
        <CompteForm
          filialeId={showCompteForm}
          onClose={() => setShowCompteForm(null)}
          onSaved={() => { setShowCompteForm(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingTarget}
        title={deletingTarget?.type === 'filiale' ? 'Supprimer la filiale' : 'Supprimer le compte bancaire'}
        message={
          deletingTarget?.type === 'filiale'
            ? 'Tous les paiements liés à cette filiale seront également supprimés. Cette action est irréversible.'
            : 'Êtes-vous sûr de vouloir supprimer ce compte bancaire ?'
        }
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingTarget(null)}
      />
    </div>
  );
}

function FilialeCard({
  filiale,
  paymentCount,
  paymentTotal,
  lastPayment,
  canManageFiliales,
  onEdit,
  onDelete,
  onAddCompte,
  onDeleteCompte,
  expanded,
  onToggleExpand,
}: {
  filiale: Filiale;
  paymentCount: number;
  paymentTotal: number;
  lastPayment: string | null;
  canManageFiliales: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddCompte: () => void;
  onDeleteCompte: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [comptes, setComptes] = useState<(CompteBancaire & { banque: Banque })[]>([]);
  const [loadingComptes, setLoadingComptes] = useState(false);

  const loadComptes = async () => {
    setLoadingComptes(true);
    const { data } = await supabase
      .from('comptes_bancaires')
      .select('*, banque:banques(*)')
      .eq('entite_id', filiale.id)
      .eq('entite_type', 'filiale');
    setComptes((data as (CompteBancaire & { banque: Banque })[]) || []);
    setLoadingComptes(false);
  };

  useEffect(() => {
    if (expanded) {
      loadComptes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{filiale.nom}</h3>
              <p className="text-xs text-gray-500 font-medium">{filiale.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canManageFiliales && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canManageFiliales && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {filiale.description && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{filiale.description}</p>
        )}
        {paymentCount > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-jeta-blue bg-jeta-blue/10 px-2.5 py-1.5 rounded-lg">
              <ReceiptText className="w-3 h-3" />
              {paymentCount} paie{paymentCount > 1 ? 'ments' : 'ment'}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-jeta-green-dark bg-jeta-green/10 px-2.5 py-1.5 rounded-lg">
              <Wallet className="w-3 h-3" />
              {formatCurrency(paymentTotal)}
            </span>
            {lastPayment && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg">
                <Calendar className="w-3 h-3 text-gray-500" />
                {formatDate(lastPayment)}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={() => { onToggleExpand(); if (!expanded) loadComptes(); }}
          className="text-sm text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1.5 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Comptes bancaires
        </button>
        {canManageFiliales && (
          <button
            onClick={onAddCompte}
            className="text-sm text-jeta-green hover:text-jeta-green-dark font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Ajouter
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 animate-slide-down">
          {loadingComptes ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-jeta-blue" />
            </div>
          ) : comptes.length === 0 ? (
            <div className="flex flex-col items-center py-4 text-gray-500">
              <Landmark className="w-6 h-6 text-gray-300 mb-2" />
              <p className="text-sm">Aucun compte bancaire</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comptes.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3 px-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-jeta-blue/20 to-jeta-blue/10 rounded-lg flex items-center justify-center">
                      <Landmark className="w-4 h-4 text-jeta-blue" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{c.banque.nom}</span>
                      <span className="text-sm text-gray-600 ml-2 font-mono">{formatRIB(c.numero_compte)}</span>
                      {c.intitule && <span className="text-xs text-gray-500 ml-2">{c.intitule}</span>}
                    </div>
                  </div>
                  {canManageFiliales && (
                    <button
                      onClick={() => onDeleteCompte(c.id)}
                      className="p-1.5 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
