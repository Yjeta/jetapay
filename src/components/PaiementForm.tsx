import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatRIB, formatCurrency, generateCodeLettrage, generateCodePaiement } from '../lib/utils';
import { X, Save, Loader2, Wallet, Calendar, Building2, Users, CreditCard, Hash, FileText, CheckCircle, ArrowLeftRight, Fingerprint } from 'lucide-react';
import type { Filiale, Fournisseur, CompteBancaire, Paiement, TypePaiement, Facture } from '../types';
import { TYPES_PAIEMENT, STATUTS_PAIEMENT } from '../types';
import { useToast } from '../hooks/useToast';
import type { PaiementInsert, PaiementUpdate } from '../types/database';

interface PaiementFormProps {
  onClose: () => void;
  onSaved: () => void;
  paiement?: Paiement | null;
  duplicateFrom?: Paiement | null;
  prefillFactureId?: string | null;
}

export function PaiementForm({ onClose, onSaved, paiement, duplicateFrom, prefillFactureId }: PaiementFormProps) {
  const toast = useToast();
  const [filiales, setFiliales] = useState<Filiale[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [comptesFiliale, setComptesFiliale] = useState<(CompteBancaire & { banque: { nom: string } })[]>([]);
  const [comptesFournisseur, setComptesFournisseur] = useState<(CompteBancaire & { banque: { nom: string } })[]>([]);
  const [comptesReceptrice, setComptesReceptrice] = useState<(CompteBancaire & { banque: { nom: string } })[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [selectedFactureIds, setSelectedFactureIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [interFiliale, setInterFiliale] = useState(!paiement?.fournisseur_id && !!paiement?.filiale_receptrice_id);
  const [codePaiement, setCodePaiement] = useState(paiement?.code_paiement || '');
  const [form, setForm] = useState({
    date_paiement: paiement ? paiement.date_paiement : new Date().toISOString().split('T')[0],
    filiale_id: paiement?.filiale_id || '',
    fournisseur_id: interFiliale ? '' : (paiement?.fournisseur_id || ''),
    filiale_receptrice_id: interFiliale ? (paiement?.filiale_receptrice_id || '') : '',
    montant: paiement ? String(paiement.montant) : '',
    type_paiement: (paiement?.type_paiement as TypePaiement) || 'Virement',
    reference: paiement?.reference || '',
    compte_bancaire_id: paiement?.compte_bancaire_id || '',
    notes: paiement?.notes || '',
    statut: paiement?.statut || 'Validé',
  });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!paiement && form.filiale_id) {
      const filiale = filiales.find(f => f.id === form.filiale_id);
      if (filiale) {
        generateCodePaiement(filiale.code).then(setCodePaiement);
      }
    }
  }, [form.filiale_id, filiales, paiement]);

  useEffect(() => {
    if (form.filiale_id) {
      loadComptes(form.filiale_id, 'filiale', setComptesFiliale);
    } else {
      setComptesFiliale([]);
    }
  }, [form.filiale_id]);

  useEffect(() => {
    if (form.fournisseur_id) {
      loadComptes(form.fournisseur_id, 'fournisseur', setComptesFournisseur);
    } else {
      setComptesFournisseur([]);
    }
  }, [form.fournisseur_id]);

  useEffect(() => {
    if (form.filiale_id && comptesFiliale.length === 0 && form.type_paiement !== 'Cash') {
      setForm((prev) => ({ ...prev, type_paiement: 'Cash', compte_bancaire_id: '' }));
    }
  }, [comptesFiliale.length, form.filiale_id, form.type_paiement]);

  useEffect(() => {
    if (form.fournisseur_id && comptesFournisseur.length === 0 && form.type_paiement === 'Virement') {
      setForm((prev) => ({ ...prev, type_paiement: 'Cash', compte_bancaire_id: '' }));
    }
  }, [comptesFournisseur.length, form.fournisseur_id, form.type_paiement]);

  useEffect(() => {
    if (!interFiliale && form.fournisseur_id) {
      loadFactures(form.fournisseur_id);
    } else {
      setFactures([]);
    }
  }, [form.fournisseur_id, interFiliale]);

  const toggleFacture = (id: string) => {
    setSelectedFactureIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    if (form.filiale_receptrice_id) {
      loadComptes(form.filiale_receptrice_id, 'filiale', setComptesReceptrice);
    } else {
      setComptesReceptrice([]);
    }
  }, [form.filiale_receptrice_id]);

  useEffect(() => {
    if (interFiliale && form.filiale_receptrice_id && comptesReceptrice.length === 0 && form.type_paiement === 'Virement') {
      setForm((prev) => ({ ...prev, type_paiement: 'Cash', compte_bancaire_id: '' }));
    }
  }, [comptesReceptrice.length, form.filiale_receptrice_id, interFiliale, form.type_paiement]);

  const loadData = async () => {
    setLoading(true);
    const [fRes, foRes] = await Promise.all([
      supabase.from('filiales').select('*').order('nom'),
      supabase.from('fournisseurs').select('*').order('nom'),
    ]);
    if (fRes.data) setFiliales(fRes.data);
    if (foRes.data) setFournisseurs(foRes.data);
    const source = paiement || duplicateFrom;
    if (source) {
      const { data: links } = await supabase
        .from('paiement_factures')
        .select('facture_id')
        .eq('paiement_id', source.id);
      if (links) setSelectedFactureIds(links.map((l) => l.facture_id));
    }
    if (duplicateFrom) {
      setInterFiliale(!duplicateFrom.fournisseur_id && !!duplicateFrom.filiale_receptrice_id);
      setForm({
        date_paiement: duplicateFrom.date_paiement,
        filiale_id: duplicateFrom.filiale_id || '',
        fournisseur_id: (!duplicateFrom.fournisseur_id && !!duplicateFrom.filiale_receptrice_id) ? '' : (duplicateFrom.fournisseur_id || ''),
        filiale_receptrice_id: (!duplicateFrom.fournisseur_id && !!duplicateFrom.filiale_receptrice_id) ? (duplicateFrom.filiale_receptrice_id || '') : '',
        montant: String(duplicateFrom.montant),
        type_paiement: (duplicateFrom.type_paiement as TypePaiement) || 'Virement',
        reference: duplicateFrom.reference || '',
        compte_bancaire_id: duplicateFrom.compte_bancaire_id || '',
        notes: duplicateFrom.notes || '',
        statut: duplicateFrom.statut || 'Validé',
      });
    }
    if (prefillFactureId) {
      const { data: fData } = await supabase
        .from('factures')
        .select('id, fournisseur_id, montant')
        .eq('id', prefillFactureId)
        .maybeSingle();
      if (fData) {
        setForm((prev) => ({ ...prev, fournisseur_id: fData.fournisseur_id }));
        setSelectedFactureIds([prefillFactureId]);
      }
    }
    setLoading(false);
  };

  const loadFactures = async (fournisseurId: string) => {
    const { data } = await supabase
      .from('factures')
      .select('*')
      .eq('fournisseur_id', fournisseurId)
      .in('statut', ['Impayée', 'Partiellement payée'])
      .order('date_facture', { ascending: false });
    setFactures((data as Facture[]) || []);
  };

  const recalculerMontantPaye = async (factureId: string, excludePaiementId?: string) => {
    let query = supabase
      .from('paiement_factures')
      .select('montant')
      .eq('facture_id', factureId);
    if (excludePaiementId) {
      query = query.neq('paiement_id', excludePaiementId);
    }
    const { data: links } = await query;
    const total = (links || []).reduce((s, l) => s + (Number(l.montant) || 0), 0);
    const { data: facture } = await supabase.from('factures').select('montant').eq('id', factureId).single();
    const statut = total <= 0 ? 'Impayée' : total >= (facture?.montant || 0) ? 'Payée' : 'Partiellement payée';
    const { error: updateErr } = await supabase.from('factures').update({ montant_paye: total, statut }).eq('id', factureId);
    if (updateErr) throw updateErr;
  };

  const loadComptes = async (entiteId: string, type: 'filiale' | 'fournisseur', setter: (comptes: (CompteBancaire & { banque: { nom: string } })[]) => void) => {
    const { data } = await supabase
      .from('comptes_bancaires')
      .select('*, banque:banques(nom)')
      .eq('entite_id', entiteId)
      .eq('entite_type', type);
    if (data) {
      setter(data as (CompteBancaire & { banque: { nom: string } })[]);
    }
  };

  const isCash = form.type_paiement === 'Cash';
  const isVirement = form.type_paiement === 'Virement';
  const needsReference = !isCash;
  const needsAccount = !isCash;
  const filialeSansCompte = form.filiale_id !== '' && comptesFiliale.length === 0;
  const fournisseurSansCompte = !interFiliale && isVirement && form.fournisseur_id !== '' && comptesFournisseur.length === 0;
  const receptriceSansCompte = interFiliale && isVirement && form.filiale_receptrice_id !== '' && comptesReceptrice.length === 0;
  const beneficiaireSansCompte = interFiliale ? receptriceSansCompte : fournisseurSansCompte;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    const missing: string[] = [];
    if (!form.filiale_id) missing.push('filiale');
    if (interFiliale) {
      if (!form.filiale_receptrice_id) missing.push('filiale réceptrice');
    } else {
      if (!form.fournisseur_id) missing.push('fournisseur');
    }
    if (!form.date_paiement) missing.push('date');
    if (!form.montant || isNaN(parseFloat(form.montant))) missing.push('montant');
    if (needsReference && !form.reference.trim()) missing.push('référence');
    if (needsAccount && !filialeSansCompte && form.filiale_id && !form.compte_bancaire_id) missing.push('compte bancaire');
    if (!interFiliale && fournisseurSansCompte) missing.push('compte bancaire fournisseur');
    if (interFiliale && receptriceSansCompte) missing.push('compte bancaire filiale réceptrice');

    if (missing.length > 0) {
      toast.warning(`Champs obligatoires : ${missing.join(', ')}`);
      setSaving(false);
      return;
    }

    setSaving(true);

    const payload: PaiementInsert | PaiementUpdate = {
      code_paiement: codePaiement || undefined,
      date_paiement: form.date_paiement,
      filiale_id: form.filiale_id,
      fournisseur_id: interFiliale ? null : form.fournisseur_id,
      filiale_receptrice_id: interFiliale ? form.filiale_receptrice_id : null,
      montant: parseFloat(form.montant),
      type_paiement: form.type_paiement,
      reference: form.reference || null,
      compte_bancaire_id: form.compte_bancaire_id || null,
      notes: form.notes || null,
      statut: form.statut,
    };

    const op = paiement
      ? supabase.from('paiements').update(payload).eq('id', paiement.id)
      : supabase.from('paiements').insert(payload).select('id').single();
    const { error, data: saved } = await op;

    setSaving(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
    } else {
      const paiementId = paiement?.id || saved?.id;
      const newFactureIds = selectedFactureIds;

      // Édition : supprimer les anciens liens, recalculer les factures affectées
      if (paiement) {
        const { data: oldLinks } = await supabase
          .from('paiement_factures')
          .select('facture_id')
          .eq('paiement_id', paiementId);
        const oldIds = (oldLinks || []).map((l) => l.facture_id);
        await supabase.from('paiement_factures').delete().eq('paiement_id', paiementId);
        const allAffectedIds = [...new Set([...oldIds, ...newFactureIds])];
        for (const fid of allAffectedIds) {
          await recalculerMontantPaye(fid);
        }
      }

      // Nouveaux liens : distribution FIFO du montant du paiement sur les factures
      if (newFactureIds.length > 0) {
        const { data: facturesData } = await supabase
          .from('factures')
          .select('id, montant, montant_paye, date_facture')
          .in('id', newFactureIds)
          .order('date_facture', { ascending: true });

        if (facturesData && facturesData.length > 0) {
          let remaining: number = payload.montant ?? 0;
          const codeLettrage = await generateCodeLettrage(form.fournisseur_id || undefined);
          const links: { paiement_id: string; facture_id: string; montant: number; code_lettrage: string }[] = [];

          for (const f of facturesData) {
            if (remaining <= 0) break;
            const unpaid = f.montant - f.montant_paye;
            if (unpaid <= 0) continue;
            const allocated = Math.min(remaining, unpaid);
            links.push({ paiement_id: paiementId, facture_id: f.id, montant: allocated, code_lettrage: codeLettrage });
            remaining -= allocated;
          }

          if (links.length > 0) {
            const { error: linkError } = await supabase.from('paiement_factures').insert(links);
            if (linkError) toast.error(`Erreur liaison factures : ${linkError.message}`);
          }
        }
      }

      for (const fid of newFactureIds) {
        await recalculerMontantPaye(fid);
      }
      toast.success(paiement ? 'Paiement mis à jour' : 'Paiement enregistré');
      window.dispatchEvent(new CustomEvent('factures-updated'));
      onSaved();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">
              {paiement ? 'Modifier le Paiement' : 'Nouveau Paiement'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-jeta-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto scrollbar-thin">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Fingerprint className="w-4 h-4 text-gray-400" />
                Code unique
              </label>
              <div className="input-field bg-gray-50 font-mono text-sm text-gray-700 select-all cursor-pointer">
                {codePaiement || (paiement ? paiement.code_paiement : '—')}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={form.date_paiement}
                  onChange={(e) => setForm({ ...form, date_paiement: e.target.value })}
                  className={`input-field ${submitted && !form.date_paiement ? 'border-red-400 bg-red-50' : ''}`}
                />
                {submitted && !form.date_paiement && <p className="text-xs text-red-500 mt-1">Date requise</p>}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  Montant (XAF)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={form.montant}
                  onChange={(e) => setForm({ ...form, montant: e.target.value })}
                  className={`input-field ${submitted && (!form.montant || isNaN(parseFloat(form.montant))) ? 'border-red-400 bg-red-50' : ''}`}
                  placeholder="0.00"
                />
                {submitted && (!form.montant || isNaN(parseFloat(form.montant))) && <p className="text-xs text-red-500 mt-1">Montant requis</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Filiale
                </label>
                <select
                  required
                  value={form.filiale_id}
                  onChange={(e) => setForm({ ...form, filiale_id: e.target.value })}
                  className={`select-field ${submitted && !form.filiale_id ? 'border-red-400 bg-red-50' : ''}`}
                >
                  <option value="">Sélectionner...</option>
                  {filiales.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
                {submitted && !form.filiale_id && <p className="text-xs text-red-500 mt-1">Filiale requise</p>}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Users className="w-4 h-4 text-gray-400" />
                  {interFiliale ? 'Filiale réceptrice' : 'Fournisseur'}
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInterFiliale(false);
                      setForm({ ...form, fournisseur_id: '', filiale_receptrice_id: '' });
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${!interFiliale ? 'bg-jeta-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    Fournisseur
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInterFiliale(true);
                      setForm({ ...form, fournisseur_id: '', filiale_receptrice_id: '' });
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${interFiliale ? 'bg-jeta-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <ArrowLeftRight className="w-3 h-3 inline mr-1" />
                    Inter-Filiale
                  </button>
                </div>
                {interFiliale ? (
                  <select
                    required
                    value={form.filiale_receptrice_id}
                    onChange={(e) => setForm({ ...form, filiale_receptrice_id: e.target.value })}
                    className={`select-field ${submitted && !form.filiale_receptrice_id ? 'border-red-400 bg-red-50' : ''}`}
                  >
                    <option value="">Sélectionner une filiale...</option>
                    {filiales.filter((f) => f.id !== form.filiale_id).map((f) => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    required
                    value={form.fournisseur_id}
                    onChange={(e) => setForm({ ...form, fournisseur_id: e.target.value })}
                    className={`select-field ${submitted && !form.fournisseur_id ? 'border-red-400 bg-red-50' : ''}`}
                  >
                    <option value="">Sélectionner...</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>{f.nom}</option>
                    ))}
                  </select>
                )}
                {submitted && !interFiliale && !form.fournisseur_id && <p className="text-xs text-red-500 mt-1">Fournisseur requis</p>}
                {submitted && interFiliale && !form.filiale_receptrice_id && <p className="text-xs text-red-500 mt-1">Filiale réceptrice requise</p>}
                {!interFiliale && isVirement && form.fournisseur_id && comptesFournisseur.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Ce fournisseur n'a pas de compte bancaire — ajoutez-en un dans la page Fournisseurs pour effectuer un virement
                  </p>
                )}
                {interFiliale && isVirement && form.filiale_receptrice_id && comptesReceptrice.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Cette filiale réceptrice n'a pas de compte bancaire — ajoutez-en un pour effectuer un virement
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  Type de Paiement
                </label>
                <select
                  required
                  value={form.type_paiement}
                  disabled={filialeSansCompte || beneficiaireSansCompte}
                  onChange={(e) => {
                    const newType = e.target.value as TypePaiement;
                    setForm({ ...form, type_paiement: newType, compte_bancaire_id: newType === 'Cash' ? '' : form.compte_bancaire_id });
                  }}
                  className={`select-field ${filialeSansCompte || beneficiaireSansCompte ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {TYPES_PAIEMENT.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {filialeSansCompte && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Cette filiale n'a pas de compte bancaire — seul le mode Cash est autorisé
                  </p>
                )}
                {fournisseurSansCompte && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Ce fournisseur n'a pas de compte bancaire — seul le mode Cash est autorisé pour ce fournisseur
                  </p>
                )}
                {receptriceSansCompte && (
                  <p className="text-xs text-amber-600 mt-1.5 font-medium">
                    Cette filiale réceptrice n'a pas de compte bancaire — seul le mode Cash est autorisé
                  </p>
                )}
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
                  {STATUTS_PAIEMENT.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Hash className="w-4 h-4 text-gray-400" />
                Référence {needsReference && <span className="text-jeta-red">*</span>}
              </label>
              <input
                type="text"
                required={needsReference}
                placeholder={isCash ? 'Non requis pour Cash' : `N° ${form.type_paiement}`}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                className={`input-field ${submitted && needsReference && !form.reference.trim() ? 'border-red-400 bg-red-50' : ''}`}
              />
              {submitted && needsReference && !form.reference.trim() && <p className="text-xs text-red-500 mt-1">Référence requise pour ce mode de paiement</p>}
            </div>

            {needsAccount && !filialeSansCompte && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  Compte Bancaire de la Filiale <span className="text-jeta-red">*</span>
                </label>
                {!form.filiale_id ? (
                  <p className="text-sm text-gray-500 italic">Sélectionnez d'abord une filiale</p>
                ) : (
                  <>
                    <select
                      required
                      value={form.compte_bancaire_id}
                      onChange={(e) => setForm({ ...form, compte_bancaire_id: e.target.value })}
                      className={`select-field ${submitted && !form.compte_bancaire_id ? 'border-red-400 bg-red-50' : ''}`}
                    >
                      <option value="">Sélectionner...</option>
                      {comptesFiliale.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.banque.nom} - {formatRIB(c.numero_compte)} {c.intitule ? `(${c.intitule})` : ''}
                        </option>
                      ))}
                    </select>
                    {submitted && !form.compte_bancaire_id && <p className="text-xs text-red-500 mt-1">Compte bancaire requis</p>}
                  </>
                )}
              </div>
            )}

            {!interFiliale && form.fournisseur_id && (
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                  <FileText className="w-4 h-4 text-gray-400" />
                  Factures liées (optionnelle — une ou plusieurs)
                </label>
                {factures.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aucune facture impayée pour ce fournisseur</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-white">
                    {factures.map((f) => {
                      const reste = f.montant - f.montant_paye;
                      const checked = selectedFactureIds.includes(f.id);
                      return (
                        <label
                          key={f.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            checked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleFacture(f.id)}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <div className="flex-1 flex items-center justify-between text-sm">
                            <span className="font-semibold text-gray-900">{f.code_facture}</span>
                            <span className="font-mono text-xs text-purple-700 font-semibold">
                              {formatCurrency(reste)} restant
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedFactureIds.length > 0 && (
                  <div className="mt-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between text-sm">
                    <span className="text-purple-700 font-semibold">{selectedFactureIds.length} facture{selectedFactureIds.length > 1 ? 's' : ''} sélectionnée{selectedFactureIds.length > 1 ? 's' : ''}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFactureIds([])}
                      className="text-xs text-gray-500 hover:text-jeta-red font-semibold transition-colors"
                    >
                      Tout effacer
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <FileText className="w-4 h-4 text-gray-400" />
                Notes / Observations
              </label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="input-field resize-none"
                placeholder="Notes optionnelles..."
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                {paiement ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
