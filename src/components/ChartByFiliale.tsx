import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DashboardStats } from '../types';
import { formatCurrency } from '../lib/utils';

const COLORS = ['#0068D6', '#45D61F', '#F40000', '#F59E0B', '#8B5CF6', '#EC4899'];

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { count: number } }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-xl shadow-xl border border-gray-100">
        <p className="font-semibold text-gray-900">{label}</p>
        <p className="text-sm text-gray-600 mt-1">
          {formatCurrency(payload[0].value)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {payload[0].payload.count} paiement{payload[0].payload.count > 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export function ChartByFiliale({ stats }: { stats: DashboardStats }) {
  const data = stats.parFiliale.map((item) => ({
    name: item.filiale.length > 12 ? item.filiale.substring(0, 12) + '...' : item.filiale,
    fullName: item.filiale,
    montant: item.montant,
    count: item.count,
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Paiements par Filiale
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          {data.length} filiale{data.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
              axisLine={{ stroke: '#E5E7EB' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(107, 114, 128, 0.1)' }} />
            <Bar
              dataKey="montant"
              radius={[6, 6, 0, 0]}
              maxBarSize={50}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  style={{
                    filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.1))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartByFiliale;
