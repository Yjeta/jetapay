import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { DashboardStats } from '../types';
import { formatCurrency } from '../lib/utils';

const COLORS = ['#0068D6', '#45D61F', '#F40000', '#F59E0B', '#8B5CF6', '#EC4899'];

interface TooltipProps {
  active?: boolean;
  payload?: { payload: { name: string; value: number; count: number } }[];
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white px-4 py-3 rounded-xl shadow-xl border border-gray-100">
        <p className="font-semibold text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600 mt-1">
          {formatCurrency(data.value)}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {data.count} paiement{data.count > 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

interface LegendProps {
  payload?: readonly { value?: string; color?: string }[];
}

const renderLegend = ({ payload }: LegendProps) => (
  <ul className="flex flex-wrap justify-center gap-3 mt-4">
    {payload?.map((entry, index: number) => (
      <li key={`item-${index}`} className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="text-sm text-gray-600 font-medium">{entry.value}</span>
      </li>
    ))}
  </ul>
);

export function ChartByType({ stats }: { stats: DashboardStats }) {
  const data = stats.parType.map((item) => ({
    name: item.type,
    value: item.montant,
    count: item.count,
  }));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-semibold text-gray-900">
          Répartition par Mode de Paiement
        </h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
          {data.length} types
        </span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ChartByType;
