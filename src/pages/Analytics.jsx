import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { getMonthlyTotals, getCategoryTotals, getExpensesForRange, formatAmount, getFinancialHealth } from '../utils';
import { startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

const RANGES = [
  { label: 'This Month', value: 'month' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: 'This Year', value: 'year' },
];

export default function Analytics() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [range, setRange] = useState('month');
  const [expenses, setExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId]
  );
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  useEffect(() => {
    if (!activeContextId) return;
    const now = new Date();
    let start, end;
    switch (range) {
      case '3m': start = startOfMonth(subMonths(now, 2)); end = endOfMonth(now); break;
      case '6m': start = startOfMonth(subMonths(now, 5)); end = endOfMonth(now); break;
      case 'year': start = startOfYear(now); end = endOfYear(now); break;
      default: start = startOfMonth(now); end = endOfMonth(now);
    }
    getExpensesForRange(activeContextId, start, end).then(setExpenses);
    const monthCount = range === 'year' ? 12 : range === '6m' ? 6 : range === '3m' ? 3 : 1;
    getMonthlyTotals(activeContextId, monthCount).then(setMonthlyData);
  }, [activeContextId, range]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const catTotals = getCategoryTotals(expenses);
  const monthlyIncome = context?.monthlyIncome || 0;
  const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - total / Math.max(monthlyData.length, 1)) / monthlyIncome) * 100 : 0;

  const pieData = Object.entries(catTotals)
    .map(([name, value]) => {
      const cat = categories?.find((c) => c.name === name);
      return { name, value, color: cat?.color || '#6b7280', icon: cat?.icon || '📦' };
    })
    .sort((a, b) => b.value - a.value);

  const barData = monthlyData.map((m) => ({ name: m.monthShort, total: m.total }));

  // Category trend data
  const categoryTrendData = useMemo(() => {
    if (!monthlyData.length || !categories) return [];
    return monthlyData.map((m) => {
      const ct = getCategoryTotals(m.expenses);
      const entry = { name: m.monthShort };
      categories.forEach((cat) => {
        entry[cat.name] = ct[cat.name] || 0;
      });
      return entry;
    });
  }, [monthlyData, categories]);

  const topCategories = pieData.slice(0, 5);
  const daysInRange = Math.max(1, new Set(expenses.map((e) => e.date)).size);
  const dailyAvg = total / daysInRange;

  const monthlyTotals = monthlyData.map((m) => m.total);
  const health = getFinancialHealth(savingsRate, catTotals, total, monthlyTotals);

  if (!context) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
        <p className="text-4xl mb-4">📈</p>
        <p>No context selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-navy dark:text-white">Analytics</h1>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === r.value
                ? 'bg-coral text-white'
                : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Financial Health */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border flex items-center gap-3">
        <span className="text-2xl">{health.emoji}</span>
        <div>
          <p className="text-sm font-medium text-navy dark:text-dark-text" style={{ color: health.color }}>{health.level.charAt(0).toUpperCase() + health.level.slice(1)}</p>
          <p className="text-xs text-gray-500 dark:text-dark-muted">{health.text}</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Total</p>
          <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">{formatAmount(total, sym)}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Daily Avg</p>
          <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">{formatAmount(dailyAvg, sym)}</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Savings</p>
          <p className={`text-lg font-heading font-bold font-mono-amount ${savingsRate > 30 ? 'text-green-600' : savingsRate > 15 ? 'text-yellow-500' : 'text-red-500'}`}>{savingsRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Category Breakdown Pie */}
      {pieData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Category Breakdown</h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" animationBegin={0} animationDuration={800}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatAmount(v, sym)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 w-full md:w-auto">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-navy dark:text-dark-text">{d.icon} {d.name}</span>
                  <span className="ml-auto font-mono-amount text-gray-500 dark:text-dark-muted">{((d.value / total) * 100).toFixed(0)}%</span>
                  <span className="font-mono-amount text-navy dark:text-dark-text font-medium">{formatAmount(d.value, sym)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Bar */}
      {barData.length > 1 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatAmount(v, sym)} />
              <Bar dataKey="total" fill="#e94560" radius={[6, 6, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category Trend Lines */}
      {categoryTrendData.length > 1 && topCategories.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Category Trends</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={categoryTrendData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
              <YAxis tick={{ fontSize: 12 }} stroke="#888" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatAmount(v, sym)} />
              <Legend />
              {topCategories.map((cat) => (
                <Line key={cat.name} type="monotone" dataKey={cat.name} stroke={cat.color} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Spending Categories */}
      {topCategories.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Top Spending Categories</h3>
          <div className="space-y-3">
            {topCategories.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 dark:text-dark-muted w-5">{i + 1}.</span>
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-medium text-navy dark:text-dark-text flex-1">{cat.name}</span>
                <span className="text-sm text-gray-400 dark:text-dark-muted font-mono-amount">{((cat.value / total) * 100).toFixed(0)}%</span>
                <span className="text-sm font-semibold font-mono-amount text-navy dark:text-dark-text">{formatAmount(cat.value, sym)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">No data for this period. Add some expenses first!</p>
        </div>
      )}
    </div>
  );
}
