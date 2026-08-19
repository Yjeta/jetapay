import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { ClipboardCheck, CheckCircle2, Loader2, ShieldCheck, Database } from 'lucide-react';

interface PendingItem {
  table: string;
  tableLabel: string;
  id: string;
  label: string;
}

const TABLES: { name: string; label: string; labelField: string }[] = [
  { name: 'paiements', label: 'Paiements', labelField: 'code_paiement' },
  { name: 'factures', label: 'Factures', labelField: 'code_facture' },
  { name: 'fournisseurs', label: 'Fournisseurs', labelField: 'nom' },
  { name: 'zones_geographiques', label: 'Provinces', labelField: 'nom' },
  { name: 'localisations', label: 'Localisations', labelField: 'nom' },
  { name: 'chantiers', label: 'Chantiers', labelField: 'nom' },
];

export function ValidationsPage() {
  const { user, hasPerm } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [missingText, setMissingText] = useState<string | null>(null);

  const canView = hasPerm('validations', 'view');
  const canValidate = hasPerm('validations', 'edit');

  const load = useCallback(async () => {
    setLoading(true);
    setMissingText(null);
    const acc: PendingItem[] = [];
    const missing: string[] = [];
    let unexpected: string | null = null;
    for (const t of TABLES) {
      const { data, error } = await supabase
        .from(t.name)
        .select(`id, ${t.labelField}`)
        .eq('validation_status', 'en_attente')
        .order(t.labelField, { ascending: true });
      if (error) {
        if (/does not exist|could not find|not found/i.test(error.message)) {
          missing.push(t.label);
        } else if (!unexpected) {
          unexpected = error.message;
        }
        continue;
      }
      for (const row of (data as unknown as Record<string, unknown>[]) || []) {
        acc.push({
          table: t.name,
          tableLabel: t.label,
          id: String(row.id || ''),
          label: String(row[t.labelField] || '—'),
        });
      }
    }
    if (missing.length > 0) {
      setMissingText(
        `La base n'est pas encore à jour : colonne « validation_status » manquante sur ${missing.join(', ')}. Appliquez la migration SQL puis cliquez sur « Réessayer ».`
      );
    } else if (unexpected) {
      toast.error(`Erreur de chargement : ${unexpected}`);
    }
    setItems(acc);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (canView) load();
    else setLoading(false);
  }, [canView, load]);

  const handleValidate = async (item: PendingItem) => {
    if (!user) return;
    setValidatingId(item.id);
    const { error } = await supabase
      .from(item.table)
      .update({
        validation_status: 'valide',
        valide_par: user.id,
        date_validation: new Date().toISOString(),
      })
      .eq('id', item.id);
    if (error) {
      toast.error(`Erreur lors de la validation : ${error.message}`);
    } else {
      toast.success(`${item.tableLabel} « ${item.label} » validé(e).`);
    }
    setValidatingId(null);
    load();
  };

  if (!canView) {
    return (
      <div className="card py-16 text-center">
        <ShieldCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Accès non autorisé à ce module.</p>
      </div>
    );
  }

  const grouped = TABLES
    .map((t) => ({ ...t, rows: items.filter((i) => i.table === t.name) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ClipboardCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Validations</h2>
            <p className="text-sm text-gray-500">Écritures de l'assistant en attente d'approbation</p>
          </div>
        </div>
        <span className="badge bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1.5">
          {items.length} en attente
        </span>
      </div>

      {missingText && (
        <div className="mb-6 card border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Database className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Base de données à mettre à jour</p>
            <p className="text-amber-800 text-sm mt-1">{missingText}</p>
            <button
              onClick={load}
              disabled={loading}
              className="btn-secondary btn-sm mt-3 disabled:opacity-50"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card py-16 text-center text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
          Chargement des écritures en attente...
        </div>
      ) : grouped.length === 0 ? (
        <div className="card py-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Aucune écriture en attente de validation</p>
          <p className="text-gray-400 text-sm mt-1">Toutes les saisies de l'assistant ont été approuvées.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <div key={g.name} className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-white flex items-center justify-between">
                <h3 className="font-bold text-gray-800">{g.label}</h3>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {g.rows.length}
                </span>
              </div>
              <ul className="divide-y divide-gray-50">
                {g.rows.map((item) => (
                  <li key={`${item.table}-${item.id}`} className="px-6 py-3.5 flex items-center justify-between gap-4">
                    <span className="font-medium text-gray-800">{item.label}</span>
                    <button
                      onClick={() => handleValidate(item)}
                      disabled={!canValidate || validatingId === item.id}
                      className="btn-primary btn-sm disabled:opacity-50"
                    >
                      {validatingId === item.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Valider
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
