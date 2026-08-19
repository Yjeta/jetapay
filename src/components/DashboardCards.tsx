import { Wallet, CreditCard, Banknote, Landmark, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import type { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  trend?: { value: number; label: string };
}

function StatCard({ title, value, subtitle, icon: Icon, gradient, shadowColor, trend }: StatCardProps) {
  return (
    <div className="stat-card bg-gradient-to-br shadow-lg hover:shadow-xl cursor-default"
         style={{
           background: `linear-gradient(135deg, ${gradient})`,
           boxShadow: `0 10px 40px -10px ${shadowColor}`,
         }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/80 text-sm font-medium mb-1">{title}</p>
          <p className="text-white text-3xl font-bold tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-white/90 text-sm font-medium mt-2">
              {subtitle}
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2">
          {trend.value >= 0 ? (
            <TrendingUp className="w-4 h-4 text-white/90" />
          ) : (
            <TrendingDown className="w-4 h-4 text-white/90" />
          )}
          <span className="text-white/90 text-sm font-medium">
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        </div>
      )}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
    </div>
  );
}

export function DashboardCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatCard
        title="Total Paiements"
        value={stats.totalPaiements.toLocaleString('fr-FR')}
        icon={Wallet}
        gradient="#0068D6 0%, #004CB3 100%"
        shadowColor="rgba(0, 104, 214, 0.4)"
      />
      <StatCard
        title="Montant Total"
        value={formatCurrency(stats.totalMontant)}
        icon={CreditCard}
        gradient="#239B16 0%, #1a7a11 100%"
        shadowColor="rgba(35, 155, 22, 0.4)"
      />
      <StatCard
        title="Paiements Cash"
        value={stats.paiementsCash.toLocaleString('fr-FR')}
        subtitle={formatCurrency(stats.montantCash)}
        icon={Banknote}
        gradient="#F59E0B 0%, #D97706 100%"
        shadowColor="rgba(245, 158, 11, 0.4)"
      />
      <StatCard
        title="Paiements Banque"
        value={stats.paiementsBanque.toLocaleString('fr-FR')}
        subtitle={formatCurrency(stats.montantBanque)}
        icon={Landmark}
        gradient="#F40000 0%, #C00000 100%"
        shadowColor="rgba(244, 0, 0, 0.35)"
      />
      <StatCard
        title="En Attente"
        value={stats.paiementsEnAttente.toLocaleString('fr-FR')}
        subtitle={formatCurrency(stats.montantEnAttente)}
        icon={Clock}
        gradient="#8B5CF6 0%, #7C3AED 100%"
        shadowColor="rgba(139, 92, 246, 0.4)"
      />
    </div>
  );
}
