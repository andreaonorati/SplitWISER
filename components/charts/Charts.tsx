'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

// ── Contribution Bar Chart ──────────────────────────────────────────
interface ContributionChartProps {
  data: Array<{
    name: string;
    paid: number;
    owes: number;
  }>;
  currency: string;
}

export function ContributionChart({ data, currency }: ContributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value, currency),
            name === 'paid' ? 'Paid' : 'Share Owed',
          ]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Legend />
        <Bar dataKey="paid" name="Paid" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="owes" name="Share Owed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Net Balance Bar Chart ───────────────────────────────────────────
interface BalanceChartProps {
  data: Array<{
    name: string;
    balance: number;
  }>;
  currency: string;
}

export function BalanceChart({ data, currency }: BalanceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value, currency), 'Net Balance']}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
        <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.balance >= 0 ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Expense Category Pie Chart ──────────────────────────────────────
interface CategoryChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
  currency: string;
}

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#78716c'];

export function CategoryPieChart({ data, currency }: CategoryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={50}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          labelLine={{ strokeWidth: 1 }}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatCurrency(value, currency)]}
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

// ── Debt Flow Diagram (simplified visual) ───────────────────────────
interface DebtFlowProps {
  settlements: Array<{
    from: { id: string; name: string };
    to: { id: string; name: string };
    amount: number;
  }>;
  currency: string;
}

export function DebtFlowDiagram({ settlements, currency }: DebtFlowProps) {
  if (settlements.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-lg font-medium">All settled up! 🎉</p>
        <p className="text-sm mt-1">No pending debts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {settlements.map((s, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-red-50 via-white to-green-50 border border-gray-100"
        >
          {/* Debtor */}
          <div className="flex-1 text-right">
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
              {s.from.name}
            </div>
          </div>

          {/* Arrow + Amount */}
          <div className="flex flex-col items-center px-4">
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(s.amount, currency)}
            </span>
            <div className="flex items-center text-gray-400 mt-1">
              <div className="w-8 h-px bg-gray-300" />
              <svg className="h-3 w-3 -ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* Creditor */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
              {s.to.name}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
