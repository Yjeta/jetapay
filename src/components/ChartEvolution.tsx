import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../lib/utils';
import type { DashboardStats } from '../types';

export function ChartEvolution({ stats }: { stats: DashboardStats }) {
  if (stats.parMois.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-jeta-blue to-jeta-blue-dark rounded-xl flex items-center justify-center shadow-lg shadow-jeta-blue/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Évolution Mensuelle</h3>
            <p className="text-xs text-gray-500 mt-0.5">Montant des paiements par mois</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={stats.parMois} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="moisLabel"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tickFormatter={(v: number) => `${(v / 1000000).toFixed(1)}M`}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                fontSize: 13,
              }}
              formatter={(value) => [formatCurrency(Number(value) || 0), 'Montant']}
              labelFormatter={(label) => `Mois : ${label}`}
            />
            <Line
              type="monotone"
              dataKey="montant"
              stroke="#0068D6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#0068D6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#004CB3', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Total mois</p>
            <p className="text-sm font-bold text-gray-900">{stats.parMois.length}</p>
          </div>
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Moyen/mois</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(stats.totalMontant / Math.max(stats.parMois.length, 1))}
            </p>
          </div>
          <div className="px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">Pic mensuel</p>
            <p className="text-sm font-bold text-gray-900">
              {formatCurrency(Math.max(...stats.parMois.map(m => m.montant), 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChartEvolution;
