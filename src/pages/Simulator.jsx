import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { getCurrentMonthExpenses, getCategoryTotals, formatAmount } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';

export default function Simulator() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId]
  );
  const expenses = useLiveQuery(
    () => (activeContextId ? getCurrentMonthExpenses(activeContextId) : []),
    [activeContextId]
  );

  const catTotals = useMemo(() => getCategoryTotals(expenses || []), [expenses]);

  const [income, setIncome] = useState(0);
  const [sliders, setSliders] = useState({});

  useEffect(() => {
    if (!context) return;
    setIncome(context.monthlyIncome);
  }, [context]);

  useEffect(() => {
    if (!catTotals) return;
    const initial = {};
    for (const [cat, amt] of Object.entries(catTotals)) {
      initial[cat] = amt;
    }
    setSliders(initial);
  }, [catTotals]);

  const currentTotal = Object.values(catTotals).reduce((s, v) => s + v, 0);
  const projectedTotal = Object.values(sliders).reduce((s, v) => s + v, 0);
  const currentSavings = (context?.monthlyIncome || 0) - currentTotal;
  const projectedSavings = income - projectedTotal;
  const savingsDiff = projectedSavings - currentSavings;
  const projectedSavingsRate = income > 0 ? (projectedSavings / income) * 100 : 0;

  const chartData = [
    { name: 'Current', savings: Math.max(0, currentSavings) },
    { name: 'Projected', savings: Math.max(0, projectedSavings) },
  ];

  const handleSlider = (cat, value) => {
    setSliders((prev) => ({ ...prev, [cat]: Number(value) }));
  };

  if (!context) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
        <p className="text-4xl mb-4">🎯</p>
        <p>No context selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-heading font-bold text-navy dark:text-white">What-If Simulator</h1>
      <p className="text-sm text-gray-500 dark:text-dark-muted">Adjust sliders to see how changes affect your savings</p>

      {/* Income slider */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-navy dark:text-dark-text">Monthly Income</label>
          <span className="text-sm font-mono-amount font-semibold text-navy dark:text-dark-text">{formatAmount(income, sym)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(income * 2, 200000)}
          step={1000}
          value={income}
          onChange={(e) => setIncome(Number(e.target.value))}
          className="w-full accent-coral h-2"
        />
      </div>

      {/* Category sliders */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border space-y-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">Expense Categories</h3>
        {Object.entries(sliders).map(([cat, value]) => {
          const original = catTotals[cat] || 0;
          const diff = value - original;
          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-navy dark:text-dark-text">{cat}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono-amount text-navy dark:text-dark-text">{formatAmount(value, sym)}</span>
                  {diff !== 0 && (
                    <span className={`text-xs font-mono-amount ${diff > 0 ? 'text-red-500' : 'text-green-600'}`}>
                      ({diff > 0 ? '+' : ''}{formatAmount(diff, sym)})
                    </span>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(original * 3, 50000)}
                step={100}
                value={value}
                onChange={(e) => handleSlider(cat, e.target.value)}
                className="w-full accent-coral h-1.5"
              />
            </div>
          );
        })}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Projected Monthly</p>
          <p className={`text-xl font-heading font-bold font-mono-amount ${projectedSavings > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatAmount(Math.abs(projectedSavings), sym)}
          </p>
          <p className="text-xs text-gray-400 dark:text-dark-muted">{projectedSavings > 0 ? 'savings' : 'deficit'}/month</p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Projected Annual</p>
          <p className={`text-xl font-heading font-bold font-mono-amount ${projectedSavings > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatAmount(Math.abs(projectedSavings * 12), sym)}
          </p>
          <p className="text-xs text-gray-400 dark:text-dark-muted">{projectedSavings > 0 ? 'savings' : 'deficit'}/year</p>
        </div>
      </div>

      {/* Savings rate and diff */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500 dark:text-dark-muted">Savings Rate</span>
          <span className={`text-lg font-heading font-bold ${projectedSavingsRate > 30 ? 'text-green-600' : projectedSavingsRate > 15 ? 'text-yellow-500' : 'text-red-500'}`}>
            {projectedSavingsRate.toFixed(0)}%
          </span>
        </div>
        {savingsDiff !== 0 && (
          <p className={`text-sm ${savingsDiff > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {savingsDiff > 0 ? '📈' : '📉'} {savingsDiff > 0 ? '+' : ''}{formatAmount(savingsDiff, sym)}/month compared to current
          </p>
        )}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">Current vs Projected Savings</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
            <YAxis tick={{ fontSize: 12 }} stroke="#888" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => formatAmount(v, sym)} />
            <Bar dataKey="savings" radius={[8, 8, 0, 0]} animationDuration={600}>
              <Cell fill="#6b7280" />
              <Cell fill="#e94560" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
