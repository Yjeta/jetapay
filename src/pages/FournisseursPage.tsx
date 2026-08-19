import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useFournisseurs, useBanques, usePaiements, useFactures } from '../hooks/useData';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SkeletonGrid } from '../components/Skeleton';
import { useToast } from '../hooks/useToast';
import { validateRIB, formatRIB, formatCurrency, formatDate } from '../lib/utils';
import { Plus, Users, Pencil, Trash2, Landmark, X, Save, Loader2, ChevronDown, ChevronUp, Phone, Mail, MapPin, Contact, CheckCircle, XCircle, ReceiptText, Wallet, Calendar, FileText, AlertTriangle, BookOpen } from 'lucide-react';
import type { FournisseurFetched } from '../hooks/useData';
import type { FournisseurInsert, FournisseurUpdate, CompteBancaire, Banque } from '../types/database';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FournisseurFormProps {
  onClose: () => void;
  onSaved: () => void;
  fournisseur?: FournisseurFetched | null;
}

function FournisseurForm({ onClose, onSaved, fournisseur }: FournisseurFormProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nom: fournisseur?.nom || '',
    domaine_activite: fournisseur?.domaine_activite || '',
    contact: fournisseur?.contact || '',
    telephone: fournisseur?.telephone || '',
    email: fournisseur?.email || '',
    adresse: fournisseur?.adresse || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const op = fournisseur
      ? supabase.from('fournisseurs').update(form as FournisseurUpdate).eq('id', fournisseur.id)
      : supabase.from('fournisseurs').insert(form as FournisseurInsert);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      toast.success(fournisseur ? 'Fournisseur mis à jour' : 'Fournisseur créé');
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {fournisseur ? 'Modifier le Fournisseur' : 'Nouveau Fournisseur'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nom</label>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="input-field"
              placeholder="Nom du fournisseur"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Domaine d'activité</label>
            <input
              value={form.domaine_activite}
              onChange={(e) => setForm({ ...form, domaine_activite: e.target.value })}
              className="input-field"
              placeholder="Secteur d'activité"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Téléphone</label>
              <input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="input-field"
                placeholder="Numéro"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                placeholder="Email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Contact</label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              className="input-field"
              placeholder="Nom et prénom du contact"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Adresse</label>
            <textarea
              rows={2}
              value={form.adresse}
              onChange={(e) => setForm({ ...form, adresse: e.target.value })}
              className="input-field resize-none"
              placeholder="Adresse complète"
            />
          </div>
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-4 h-4" />
              {fournisseur ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CompteFormProps {
  fournisseurId: string;
  onClose: () => void;
  onSaved: () => void;
}

function CompteForm({ fournisseurId, onClose, onSaved }: CompteFormProps) {
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
      entite_type: 'fournisseur',
      entite_id: fournisseurId,
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

export function FournisseursPage() {
  const navigate = useNavigate();
  const { data: fournisseurs, loading, refresh } = useFournisseurs();
  const { data: paiements } = usePaiements();
  const { data: factures } = useFactures();
  const toast = useToast();
  const { hasPerm } = useAuth();

  const factureStats = useMemo(() => {
    const map = new Map<string, { count: number; montant: number; impaye: number }>();
    for (const f of factures) {
      const existing = map.get(f.fournisseur_id) || { count: 0, montant: 0, impaye: 0 };
      existing.count++;
      existing.montant += f.montant;
      existing.impaye += f.montant - f.montant_paye;
      map.set(f.fournisseur_id, existing);
    }
    return map;
  }, [factures]);
  const [showForm, setShowForm] = useState(false);

  const paymentStats = useMemo(() => {
    const map = new Map<string, { count: number; montant: number; dernierPaiement: string | null }>();
    for (const p of paiements) {
      if (p.deleted_at) continue;
      const id = p.fournisseur_id;
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
  const [editingFournisseur, setEditingFournisseur] = useState<FournisseurFetched | null>(null);
  const [showCompteForm, setShowCompteForm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const [deletingTarget, setDeletingTarget] = useState<{ type: 'fournisseur' | 'compte'; id: string } | null>(null);

  const handleSearch = useCallback((value: string) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchDebounced(value);
    }, 300);
  }, []);

  const filtered = fournisseurs.filter((f) => {
    const s = searchDebounced.toLowerCase();
    return !s || f.nom.toLowerCase().includes(s) || (f.domaine_activite || '').toLowerCase().includes(s);
  });

  const handleDelete = async () => {
    if (!deletingTarget) return;
    const { error } = await supabase.from(
      deletingTarget.type === 'fournisseur' ? 'fournisseurs' : 'comptes_bancaires'
    ).delete().eq('id', deletingTarget.id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success(
        deletingTarget.type === 'fournisseur'
          ? 'Fournisseur supprimé'
          : 'Compte bancaire supprimé'
      );
    }
    setDeletingTarget(null);
    refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Fournisseurs</h2>
            <p className="text-sm text-gray-500">Gestion des fournisseurs et de leurs comptes bancaires</p>
          </div>
        </div>
        {hasPerm('fournisseurs', 'create') && (
          <button
            onClick={() => { setEditingFournisseur(null); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Nouveau Fournisseur
          </button>
        )}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un fournisseur..."
            defaultValue=""
            onChange={(e) => handleSearch(e.target.value)}
            className="input-field pl-12 text-base"
          />
      </div>

      {loading ? (
        <SkeletonGrid cards={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((f) => {
            const stats = paymentStats.get(f.id);
            const fStats = factureStats.get(f.id);
            return (
              <FournisseurCard
                key={f.id}
                fournisseur={f}
                paymentCount={stats?.count || 0}
                paymentTotal={stats?.montant || 0}
                lastPayment={stats?.dernierPaiement || null}
                invoiceCount={fStats?.count || 0}
                invoiceImpaye={fStats?.impaye || 0}
                canEdit={hasPerm('fournisseurs', 'edit')}
                canDelete={hasPerm('fournisseurs', 'delete')}
                onEdit={() => { setEditingFournisseur(f); setShowForm(true); }}
                onDelete={() => setDeletingTarget({ type: 'fournisseur', id: f.id })}
                onGrandLivre={() => navigate(`/grand-livre/${f.id}`)}
                onAddCompte={() => setShowCompteForm(f.id)}
                onDeleteCompte={(id) => setDeletingTarget({ type: 'compte', id })}
                expanded={expandedId === f.id}
                onToggleExpand={() => setExpandedId(expandedId === f.id ? null : f.id)}
              />
            );
          })}
        </div>
      )}

      {showForm && (
        <FournisseurForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh(); }}
          fournisseur={editingFournisseur}
        />
      )}
      {showCompteForm && (
        <CompteForm
          fournisseurId={showCompteForm}
          onClose={() => setShowCompteForm(null)}
          onSaved={() => { setShowCompteForm(null); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingTarget}
        title={deletingTarget?.type === 'fournisseur' ? 'Supprimer le fournisseur' : 'Supprimer le compte bancaire'}
        message={
          deletingTarget?.type === 'fournisseur'
            ? 'Tous les paiements liés à ce fournisseur seront également supprimés. Cette action est irréversible.'
            : 'Êtes-vous sûr de vouloir supprimer ce compte bancaire ?'
        }
        confirmLabel="Supprimer"
        onConfirm={handleDelete}
        onCancel={() => setDeletingTarget(null)}
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

function FournisseurCard({
  fournisseur,
  paymentCount,
  paymentTotal,
  lastPayment,
  invoiceCount,
  invoiceImpaye,
  onEdit,
  onDelete,
  onGrandLivre,
  onAddCompte,
  onDeleteCompte,
  canEdit,
  canDelete,
  expanded,
  onToggleExpand,
}: {
  fournisseur: FournisseurFetched;
  paymentCount: number;
  paymentTotal: number;
  lastPayment: string | null;
  invoiceCount: number;
  invoiceImpaye: number;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onGrandLivre: () => void;
  onAddCompte: () => void;
  onDeleteCompte: (id: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const [comptes, setComptes] = useState<(CompteBancaire & { banque: Banque })[]>([]);
  const [loadingComptes, setLoadingComptes] = useState(false);

  useEffect(() => {
    if (expanded) {
      const load = async () => {
        setLoadingComptes(true);
        const { data } = await supabase
          .from('comptes_bancaires')
          .select('*, banque:banques(*)')
          .eq('entite_id', fournisseur.id)
          .eq('entite_type', 'fournisseur');
        setComptes((data as (CompteBancaire & { banque: Banque })[]) || []);
        setLoadingComptes(false);
      };
      load();
    }
  }, [expanded, fournisseur.id]);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-jeta-green to-jeta-green-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-green/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{fournisseur.nom}</h3>
              {fournisseur.validation_status === 'en_attente' && (
                <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-[10px]">En attente</span>
              )}
              {fournisseur.domaine_activite && (
                <p className="text-xs text-gray-500 font-medium">{fournisseur.domaine_activite}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-jeta-red hover:bg-jeta-red/5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
          {fournisseur.telephone && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Phone className="w-3 h-3 text-gray-500" />
              {fournisseur.telephone}
            </span>
          )}
          {fournisseur.email && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Mail className="w-3 h-3 text-gray-500" />
              {fournisseur.email}
            </span>
          )}
          {fournisseur.contact && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <Contact className="w-3 h-3 text-gray-500" />
              {fournisseur.contact}
            </span>
          )}
          {fournisseur.adresse && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span className="truncate max-w-[150px]">{fournisseur.adresse}</span>
            </span>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {paymentCount > 0 && (
            <>
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
            </>
          )}
          {invoiceCount > 0 && (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1.5 rounded-lg">
                <FileText className="w-3 h-3" />
                {invoiceCount} facture{invoiceCount > 1 ? 's' : ''}
              </span>
              {invoiceImpaye > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-jeta-red bg-red-50 px-2.5 py-1.5 rounded-lg">
                  <AlertTriangle className="w-3 h-3" />
                  {formatCurrency(invoiceImpaye)} dû
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpand}
            className="text-sm text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1.5 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Comptes bancaires
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={onGrandLivre}
            className="text-sm text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Grand Livre
          </button>
        </div>
        {canEdit && (
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
                  {canDelete && (
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
