import { useState, useMemo, lazy, Suspense } from 'react';
import { usePaiements } from '../hooks/useData';
import { useDashboardStats } from '../hooks/useData';
import { useToast } from '../hooks/useToast';
const ChartEvolution = lazy(() => import('../components/ChartEvolution'));
import { SkeletonCard, SkeletonTable, SkeletonChart } from '../components/Skeleton';
import { exportToCSV, formatCurrency, formatDate } from '../lib/utils';
import { TrendingUp, Building2, Users, Banknote, BarChart3, ChevronDown, ChevronUp, Receipt, FileSpreadsheet, FileText, CalendarRange, X, CalendarDays } from 'lucide-react';

export function RapportsPage() {
  const { data: paiements, loading } = usePaiements();
  const toast = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredPaiements = useMemo(() => {
    return paiements.filter((p) => {
      if (p.deleted_at) return false;
      if (dateFrom && p.date_paiement < dateFrom) return false;
      if (dateTo && p.date_paiement > dateTo) return false;
      return true;
    });
  }, [paiements, dateFrom, dateTo]);

  const stats = useDashboardStats(filteredPaiements);
  const [expandedSection, setExpandedSection] = useState<string | null>('parFiliale');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const exportCSV = () => {
    if (filteredPaiements.length === 0) return;
    const headers = ['Date', 'Code', 'Filiale', 'Fournisseur', 'Type', 'Montant', 'Reference', 'Statut', 'Notes'];
    const rows = filteredPaiements.map((p) => [
      formatDate(p.date_paiement),
      p.code_paiement || '',
      p.filiale.nom,
      p.fournisseur ? p.fournisseur.nom : (p.filiale_receptrice ? p.filiale_receptrice.nom : 'Interne'),
      p.type_paiement,
      String(p.montant),
      p.reference || '',
      p.statut,
      p.notes || '',
    ]);
    exportToCSV(`paiements_jeta_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportPDF = async () => {
    if (filteredPaiements.length === 0) { toast.info('Aucun paiement à exporter sur cette période.'); return; }
    const { generatePaiementsPeriodPdf } = await import('../lib/generateReceipt');
    generatePaiementsPeriodPdf(
      filteredPaiements.map((p) => {
        const codePaiement = (p as { code_paiement?: string | null }).code_paiement;
        const filialeCode = p.filiale ? (p.filiale as { code?: string | null }).code ?? null : null;
        const banqueNom = (p as { compte_bancaire?: { banque?: { nom?: string | null } | null } | null }).compte_bancaire?.banque?.nom ?? null;
        return {
          id: p.id,
          date_paiement: p.date_paiement,
          code_paiement: codePaiement || null,
          filiale: p.filiale ? { nom: p.filiale.nom, code: filialeCode } : null,
          banque: banqueNom,
          fournisseur: p.fournisseur ? { nom: p.fournisseur.nom } : null,
          filiale_receptrice: p.filiale_receptrice ? { nom: p.filiale_receptrice.nom } : null,
          type_paiement: p.type_paiement,
          montant: p.montant,
          reference: p.reference,
          statut: p.statut,
          notes: p.notes,
        };
      }),
      dateFrom,
      dateTo
    );
  };

  const setToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setDateFrom(today);
    setDateTo(today);
  };

  const exportParFilialeCSV = () => {
    const headers = ['Filiale', 'Nombre de paiements', 'Montant total'];
    const rows = stats.parFiliale.map((item) => [
      item.filiale,
      String(item.count),
      String(item.montant),
    ]);
    exportToCSV(`rapport_filiales_jeta_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportParFournisseurCSV = () => {
    const headers = ['Fournisseur', 'Nombre de paiements', 'Montant total'];
    const rows = stats.parFournisseur.map((item) => [
      item.fournisseur,
      String(item.count),
      String(item.montant),
    ]);
    exportToCSV(`rapport_fournisseurs_jeta_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportParTypeCSV = () => {
    const headers = ['Type de paiement', 'Nombre de paiements', 'Montant total'];
    const rows = stats.parType.map((item) => [
      item.type,
      String(item.count),
      String(item.montant),
    ]);
    exportToCSV(`rapport_types_jeta_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const statCards = [
    {
      title: 'Total Paiements',
      value: stats.totalPaiements.toLocaleString('fr-FR'),
      subtitle: formatCurrency(stats.totalMontant),
      icon: Receipt,
      gradientFrom: '#0068D6',
      gradientTo: '#004CB3',
      shadowColor: 'rgba(0, 104, 214, 0.4)',
    },
    {
      title: 'Paiements Cash',
      value: stats.paiementsCash.toLocaleString('fr-FR'),
      subtitle: formatCurrency(stats.montantCash),
      icon: Banknote,
      gradientFrom: '#F59E0B',
      gradientTo: '#D97706',
      shadowColor: 'rgba(245, 158, 11, 0.4)',
    },
    {
      title: 'Paiements Banque',
      value: stats.paiementsBanque.toLocaleString('fr-FR'),
      subtitle: formatCurrency(stats.montantBanque),
      icon: TrendingUp,
      gradientFrom: '#45D61F',
      gradientTo: '#239B16',
      shadowColor: 'rgba(35, 155, 22, 0.4)',
    },
    {
      title: 'Moyenne/Paiement',
      value: stats.totalPaiements > 0 ? formatCurrency(stats.totalMontant / stats.totalPaiements) : '0 XAF',
      subtitle: `${stats.totalPaiements} transaction${stats.totalPaiements !== 1 ? 's' : ''}`,
      icon: BarChart3,
      gradientFrom: '#F40000',
      gradientTo: '#C00000',
      shadowColor: 'rgba(244, 0, 0, 0.35)',
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-jeta-red to-jeta-red-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-red/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Rapports</h2>
            <p className="text-sm text-gray-500">Analyses et export des données de paiement</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportPDF}
            disabled={loading || filteredPaiements.length === 0}
            className="btn-primary"
          >
            <FileText className="w-4 h-4" />
            Exporter PDF
          </button>
          <button
            onClick={exportCSV}
            disabled={loading || filteredPaiements.length === 0}
            className="btn-secondary"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card mb-6 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-jeta-red/5 to-transparent border-b border-gray-100 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <CalendarRange className="w-4 h-4 text-jeta-red" />
            Période d'analyse
          </div>
          <div className="flex items-center gap-3 flex-1 flex-wrap">
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
                className="text-xs text-jeta-red hover:text-jeta-red-dark font-semibold flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Réinitialiser
              </button>
            )}
            <button
              onClick={setToday}
              className="text-xs text-jeta-blue hover:text-jeta-blue-dark font-semibold flex items-center gap-1 transition-colors"
            >
              <CalendarDays className="w-3 h-3" />
              Aujourd'hui
            </button>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            {filteredPaiements.length} / {paiements.length} paiements
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          statCards.map((card, idx) => (
            <div
              key={idx}
              className="stat-card shadow-lg hover:shadow-xl cursor-default"
              style={{
                background: `linear-gradient(135deg, ${card.gradientFrom} 0%, ${card.gradientTo} 100%)`,
                boxShadow: `0 10px 40px -10px ${card.shadowColor}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium mb-1">{card.title}</p>
                  <p className="text-white text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-white/90 text-sm font-medium mt-2">{card.subtitle}</p>
                </div>
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <card.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
            </div>
          ))
        )}
      </div>

      {/* Monthly Evolution */}
      {!loading && stats.parMois.length > 1 && (
        <Suspense fallback={<SkeletonChart />}>
          <div className="mb-8">
            <ChartEvolution stats={stats} />
          </div>
        </Suspense>
      )}

      {/* Par Filiale */}
      <ReportSection
        title="Paiements par Filiale"
        subtitle="Quelle filiale a dépensé le plus ?"
        icon={Building2}
        iconColor="from-jeta-blue to-jeta-blue-dark"
        expanded={expandedSection === 'parFiliale'}
        onToggle={() => toggleSection('parFiliale')}
        onExport={exportParFilialeCSV}
      >
        <ReportTable
          data={stats.parFiliale.sort((a, b) => b.montant - a.montant)}
          columns={['Filiale', 'Nombre', 'Montant', '%']}
          renderRow={(item) => (
            <tr key={item.filiale} className="table-row">
              <td className="py-3 font-semibold text-gray-900">{item.filiale}</td>
              <td className="py-3 text-right text-gray-600">{item.count}</td>
              <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(item.montant)}</td>
              <td className="py-3 text-right text-gray-600">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-jeta-blue/10 text-jeta-blue">
                  {stats.totalMontant > 0 ? ((item.montant / stats.totalMontant) * 100).toFixed(1) : '0.0'}%
                </span>
              </td>
            </tr>
          )}
        />
      </ReportSection>

      {/* Par Fournisseur */}
      <ReportSection
        title="Paiements par Fournisseur"
        subtitle="Qui a reçu le plus ?"
        icon={Users}
        iconColor="from-jeta-green to-jeta-green-dark"
        expanded={expandedSection === 'parFournisseur'}
        onToggle={() => toggleSection('parFournisseur')}
        onExport={exportParFournisseurCSV}
      >
        <ReportTable
          data={stats.parFournisseur.sort((a, b) => b.montant - a.montant)}
          columns={['Fournisseur', 'Nombre', 'Montant', '%']}
          renderRow={(item) => (
            <tr key={item.fournisseur} className="table-row">
              <td className="py-3 font-semibold text-gray-900">{item.fournisseur}</td>
              <td className="py-3 text-right text-gray-600">{item.count}</td>
              <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(item.montant)}</td>
              <td className="py-3 text-right text-gray-600">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-jeta-green/10 text-jeta-green-dark">
                  {stats.totalMontant > 0 ? ((item.montant / stats.totalMontant) * 100).toFixed(1) : '0.0'}%
                </span>
              </td>
            </tr>
          )}
        />
      </ReportSection>

      {/* Par Type */}
      <ReportSection
        title="Répartition par Type de Paiement"
        subtitle="Cash, Chèque, Virement, Traite, Mise à disposition, Opération bancaire"
        icon={Banknote}
        iconColor="from-amber-500 to-amber-600"
        expanded={expandedSection === 'parType'}
        onToggle={() => toggleSection('parType')}
        onExport={exportParTypeCSV}
      >
        <ReportTable
          data={stats.parType.sort((a, b) => b.montant - a.montant)}
          columns={['Type', 'Nombre', 'Montant', '%']}
          renderRow={(item) => (
            <tr key={item.type} className="table-row">
              <td className="py-3 font-semibold text-gray-900">{item.type}</td>
              <td className="py-3 text-right text-gray-600">{item.count}</td>
              <td className="py-3 text-right font-bold text-gray-900">{formatCurrency(item.montant)}</td>
              <td className="py-3 text-right text-gray-600">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  {stats.totalMontant > 0 ? ((item.montant / stats.totalMontant) * 100).toFixed(1) : '0.0'}%
                </span>
              </td>
            </tr>
          )}
        />
      </ReportSection>

      {/* Derniers paiements */}
      <div className="card overflow-hidden mt-6">
        <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Derniers paiements</h3>
              <p className="text-xs text-gray-500 mt-0.5">Les 10 derniers paiements enregistrés</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto table-scroll">
          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Code</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Filiale</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Fournisseur</th>
                <th className="text-left px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Type</th>
                <th className="text-right px-6 py-3.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Montant</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaiements.slice(0, 10).map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-6 py-4 text-gray-700 font-medium">{formatDate(p.date_paiement)}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-semibold text-jeta-blue">
                      {p.code_paiement || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{p.filiale.nom}</td>
                  <td className="px-6 py-4 text-gray-700">
                    {p.fournisseur ? p.fournisseur.nom : (p.filiale_receptrice ? p.filiale_receptrice.nom : '—')}
                  </td>
                  <td className="px-6 py-4">
                    <span className="badge bg-gray-100 text-gray-700 border-gray-200">
                      {p.type_paiement}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(p.montant)}</td>
                </tr>
              ))}
              {filteredPaiements.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    Aucun paiement
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
}

interface ReportSectionProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  iconColor: string;
  expanded: boolean;
  onToggle: () => void;
  onExport: () => void;
  children: React.ReactNode;
}

function ReportSection({ title, subtitle, icon: Icon, iconColor, expanded, onToggle, onExport, children }: ReportSectionProps) {
  return (
    <div className="card overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 bg-gradient-to-br ${iconColor} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onExport(); }}
            className="p-2.5 text-gray-400 hover:text-jeta-blue hover:bg-jeta-blue/5 rounded-lg transition-colors"
            title="Exporter"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5 bg-gray-50/50 animate-slide-down">
          {children}
        </div>
      )}
    </div>
  );
}

interface ReportTableProps<T> {
  data: T[];
  columns: string[];
  renderRow: (item: T) => React.ReactNode;
}

function ReportTable<T>({ data, columns, renderRow }: ReportTableProps<T>) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200">
          {columns.map((col, idx) => (
            <th key={idx} className={`py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider ${idx === 0 ? 'text-left' : 'text-right'}`}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="text-center py-8 text-gray-500">
              Aucune donnée
            </td>
          </tr>
        ) : (
          data.map((item) => renderRow(item))
        )}
      </tbody>
    </table>
  );
}
