import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { getMonthlyTotals, getCategoryTotals, formatAmount } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function Compare() {
  const { currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [ctx1Id, setCtx1Id] = useState('');
  const [ctx2Id, setCtx2Id] = useState('');
  const [data1, setData1] = useState(null);
  const [data2, setData2] = useState(null);

  const contexts = useLiveQuery(() => db.contexts.toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  useEffect(() => {
    if (!ctx1Id) { setData1(null); return; }
    getMonthlyTotals(Number(ctx1Id), 12).then((months) => {
      const allExpenses = months.flatMap((m) => m.expenses);
      const total = allExpenses.reduce((s, e) => s + e.amount, 0);
      const activeMonths = months.filter((m) => m.total > 0).length || 1;
      setData1({
        avgMonthly: total / activeMonths,
        catTotals: getCategoryTotals(allExpenses),
        total,
        months: activeMonths,
      });
    });
  }, [ctx1Id]);

  useEffect(() => {
    if (!ctx2Id) { setData2(null); return; }
    getMonthlyTotals(Number(ctx2Id), 12).then((months) => {
      const allExpenses = months.flatMap((m) => m.expenses);
      const total = allExpenses.reduce((s, e) => s + e.amount, 0);
      const activeMonths = months.filter((m) => m.total > 0).length || 1;
      setData2({
        avgMonthly: total / activeMonths,
        catTotals: getCategoryTotals(allExpenses),
        total,
        months: activeMonths,
      });
    });
  }, [ctx2Id]);

  const ctx1 = contexts?.find((c) => c.id === Number(ctx1Id));
  const ctx2 = contexts?.find((c) => c.id === Number(ctx2Id));

  // Comparison chart data
  const comparisonData = categories?.map((cat) => ({
    name: cat.name,
    [ctx1?.name || 'Context 1']: data1?.catTotals[cat.name] ? data1.catTotals[cat.name] / (data1.months || 1) : 0,
    [ctx2?.name || 'Context 2']: data2?.catTotals[cat.name] ? data2.catTotals[cat.name] / (data2.months || 1) : 0,
  })).filter((d) => d[ctx1?.name || 'Context 1'] > 0 || d[ctx2?.name || 'Context 2'] > 0) || [];

  // Top differences
  const differences = comparisonData
    .map((d) => {
      const v1 = d[ctx1?.name || 'Context 1'];
      const v2 = d[ctx2?.name || 'Context 2'];
      const diff = v2 - v1;
      const pct = v1 > 0 ? ((diff / v1) * 100).toFixed(0) : v2 > 0 ? 100 : 0;
      return { category: d.name, v1, v2, diff, pct: Number(pct) };
    })
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
    .slice(0, 3);

  const savingsRate1 = ctx1 && data1 ? ((ctx1.monthlyIncome - data1.avgMonthly) / ctx1.monthlyIncome) * 100 : 0;
  const savingsRate2 = ctx2 && data2 ? ((ctx2.monthlyIncome - data2.avgMonthly) / ctx2.monthlyIncome) * 100 : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-heading font-bold text-navy dark:text-white">Compare Contexts</h1>

      <div className="grid grid-cols-2 gap-3">
        <select value={ctx1Id} onChange={(e) => setCtx1Id(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40">
          <option value="">Select context...</option>
          {contexts?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={ctx2Id} onChange={(e) => setCtx2Id(e.target.value)} className="px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40">
          <option value="">Select context...</option>
          {contexts?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {data1 && data2 && ctx1 && ctx2 && (
        <>
          {/* Side by side cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <p className="text-xs text-gray-400 dark:text-dark-muted mb-1">{ctx1.name}</p>
              <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">{formatAmount(data1.avgMonthly, sym)}</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted">avg/month</p>
              <p className={`text-sm font-heading font-semibold mt-2 ${savingsRate1 > 30 ? 'text-green-600' : 'text-yellow-500'}`}>{savingsRate1.toFixed(0)}% savings</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <p className="text-xs text-gray-400 dark:text-dark-muted mb-1">{ctx2.name}</p>
              <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">{formatAmount(data2.avgMonthly, sym)}</p>
              <p className="text-xs text-gray-400 dark:text-dark-muted">avg/month</p>
              <p className={`text-sm font-heading font-semibold mt-2 ${savingsRate2 > 30 ? 'text-green-600' : 'text-yellow-500'}`}>{savingsRate2.toFixed(0)}% savings</p>
            </div>
          </div>

          {/* Overall change */}
          {data1.avgMonthly > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
              <p className="text-sm text-gray-500 dark:text-dark-muted">Overall cost of living change</p>
              <p className={`text-2xl font-heading font-bold ${data2.avgMonthly > data1.avgMonthly ? 'text-red-500' : 'text-green-600'}`}>
                {data2.avgMonthly > data1.avgMonthly ? '+' : ''}{(((data2.avgMonthly - data1.avgMonthly) / data1.avgMonthly) * 100).toFixed(0)}%
              </p>
            </div>
          )}

          {/* Category comparison bar chart */}
          {comparisonData.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Category Comparison (avg/month)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={comparisonData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#888" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="#888" width={80} />
                  <Tooltip formatter={(v) => formatAmount(v, sym)} />
                  <Legend />
                  <Bar dataKey={ctx1.name} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  <Bar dataKey={ctx2.name} fill="#e94560" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top differences */}
          {differences.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Biggest Differences</h3>
              <div className="space-y-3">
                {differences.map((d) => (
                  <div key={d.category} className="flex items-center gap-3 text-sm">
                    <span className="text-navy dark:text-dark-text font-medium flex-1">{d.category}</span>
                    <span className={`font-mono-amount font-medium ${d.diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {d.diff > 0 ? '+' : ''}{d.pct}%
                    </span>
                    <span className="text-gray-400 dark:text-dark-muted font-mono-amount">
                      {formatAmount(Math.abs(d.diff), sym)}{d.diff > 0 ? ' higher' : ' lower'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(!ctx1Id || !ctx2Id) && (
        <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
          <p className="text-4xl mb-2">🔄</p>
          <p className="text-sm">Select two contexts above to compare them</p>
        </div>
      )}
    </div>
  );
}
