import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db";
import { CURRENCIES, getCurrencySymbol, useStore } from "../store";
import { formatAmount, getCategoryTotals, getMonthlyTotals } from "../utils";

// Rough exchange rates relative to INR (for comparison only, not financial accuracy)
const RATES_TO_INR = {
  INR: 1,
  USD: 84,
  AED: 22.9,
  EUR: 92,
  GBP: 107,
  SGD: 63,
};

function convertToCommon(amount, fromCurrency, toCurrency) {
  const inINR = amount * (RATES_TO_INR[fromCurrency] || 1);
  return inINR / (RATES_TO_INR[toCurrency] || 1);
}

const COLORS = ["#3b82f6", "#E85D4A", "#8b5cf6"];

export default function Compare() {
  const { currency } = useStore();
  const [selectedIds, setSelectedIds] = useState(["", "", ""]);
  const [compareCurrency, setCompareCurrency] = useState(currency);
  const [contextData, setContextData] = useState([null, null, null]);

  const compareSym = getCurrencySymbol(compareCurrency);
  const contexts = useLiveQuery(() => db.contexts.toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const updateSelection = (index, value) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  // Load data for each selected context
  useEffect(() => {
    selectedIds.forEach((id, index) => {
      if (!id) {
        setContextData((prev) => {
          const next = [...prev];
          next[index] = null;
          return next;
        });
        return;
      }
      getMonthlyTotals(Number(id), 12).then((months) => {
        const allExpenses = months.flatMap((m) => m.expenses);
        const total = allExpenses.reduce((s, e) => s + e.amount, 0);
        const activeMonths = months.filter((m) => m.total > 0).length || 1;
        setContextData((prev) => {
          const next = [...prev];
          next[index] = {
            avgMonthly: total / activeMonths,
            catTotals: getCategoryTotals(allExpenses),
            total,
            months: activeMonths,
          };
          return next;
        });
      });
    });
  }, [selectedIds]);

  const activeContexts = selectedIds
    .map((id, i) => ({
      id,
      data: contextData[i],
      ctx: contexts?.find((c) => c.id === Number(id)),
      index: i,
    }))
    .filter((x) => x.id && x.data && x.ctx);

  // Category comparison chart data with currency normalization
  const comparisonData = useMemo(() => {
    if (!categories || activeContexts.length < 2) return [];
    return (
      categories
        .map((cat) => {
          const entry = { name: cat.name };
          activeContexts.forEach(({ ctx, data }) => {
            const raw = data.catTotals[cat.name]
              ? data.catTotals[cat.name] / (data.months || 1)
              : 0;
            entry[ctx.name] = Math.round(
              convertToCommon(
                raw,
                ctx.currency || compareCurrency,
                compareCurrency,
              ),
            );
          });
          return entry;
        })
        .filter((d) => activeContexts.some(({ ctx }) => d[ctx.name] > 0)) || []
    );
  }, [categories, activeContexts, compareCurrency]);

  // Top differences (between first two contexts)
  const differences = useMemo(() => {
    if (activeContexts.length < 2) return [];
    const ctx1 = activeContexts[0];
    const ctx2 = activeContexts[1];
    return comparisonData
      .map((d) => {
        const v1 = d[ctx1.ctx.name] || 0;
        const v2 = d[ctx2.ctx.name] || 0;
        const diff = v2 - v1;
        const pct = v1 > 0 ? ((diff / v1) * 100).toFixed(0) : v2 > 0 ? 100 : 0;
        return { category: d.name, v1, v2, diff, pct: Number(pct) };
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
  }, [comparisonData, activeContexts]);

  // Insights text
  const insights = useMemo(() => {
    if (activeContexts.length < 2) return [];
    const msgs = [];
    differences.forEach((d) => {
      if (Math.abs(d.pct) >= 20 && d.v1 > 0) {
        const ctx1Name = activeContexts[0].ctx.name;
        const ctx2Name = activeContexts[1].ctx.name;
        if (d.diff > 0) {
          msgs.push(
            `You spend ${Math.abs(d.pct)}% more on ${d.category} in ${ctx2Name} vs ${ctx1Name}`,
          );
        } else {
          msgs.push(
            `You spend ${Math.abs(d.pct)}% less on ${d.category} in ${ctx2Name} vs ${ctx1Name}`,
          );
        }
      }
    });
    return msgs.slice(0, 3);
  }, [differences, activeContexts]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
        Compare Contexts
      </h1>

      {/* Context selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <select
            key={i}
            value={selectedIds[i]}
            onChange={(e) => updateSelection(i, e.target.value)}
            className="px-3 py-2 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            <option value="">
              {i === 2
                ? "(Optional) Context 3..."
                : `Select context ${i + 1}...`}
            </option>
            {contexts?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ))}
      </div>

      {/* Comparison currency picker */}
      {activeContexts.length >= 2 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-dark-muted">
            Compare in:
          </span>
          <select
            value={compareCurrency}
            onChange={(e) => setCompareCurrency(e.target.value)}
            className="px-2 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
              <option key={code} value={code}>
                {symbol} {code}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeContexts.length >= 2 && (
        <>
          {/* Side by side cards */}
          <div
            className={`grid gap-3 ${activeContexts.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}
          >
            {activeContexts.map(({ ctx, data, index }) => {
              const normalizedAvg = convertToCommon(
                data.avgMonthly,
                ctx.currency || compareCurrency,
                compareCurrency,
              );
              const normalizedIncome = convertToCommon(
                ctx.monthlyIncome || 0,
                ctx.currency || compareCurrency,
                compareCurrency,
              );
              const savingsRate =
                normalizedIncome > 0
                  ? ((normalizedIncome - normalizedAvg) / normalizedIncome) *
                    100
                  : 0;

              return (
                <div
                  key={ctx.id}
                  className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border"
                  style={{ borderTopColor: COLORS[index], borderTopWidth: 3 }}
                >
                  <p className="text-xs text-gray-400 dark:text-dark-muted mb-1 truncate">
                    {ctx.name}
                  </p>
                  <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
                    {formatAmount(normalizedAvg, compareSym)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-muted">
                    avg/month
                  </p>
                  <p
                    className={`text-sm font-heading font-semibold mt-2 ${savingsRate > 30 ? "text-green-600" : savingsRate > 0 ? "text-yellow-500" : "text-red-500"}`}
                  >
                    {savingsRate.toFixed(0)}% savings
                  </p>
                </div>
              );
            })}
          </div>

          {/* Overall cost change between first two */}
          {activeContexts.length >= 2 &&
            (() => {
              const avg1 = convertToCommon(
                activeContexts[0].data.avgMonthly,
                activeContexts[0].ctx.currency || compareCurrency,
                compareCurrency,
              );
              const avg2 = convertToCommon(
                activeContexts[1].data.avgMonthly,
                activeContexts[1].ctx.currency || compareCurrency,
                compareCurrency,
              );
              if (avg1 <= 0) return null;
              const pctChange = ((avg2 - avg1) / avg1) * 100;
              return (
                <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
                  <p className="text-sm text-gray-500 dark:text-dark-muted">
                    Cost of living: {activeContexts[0].ctx.name} →{" "}
                    {activeContexts[1].ctx.name}
                  </p>
                  <p
                    className={`text-2xl font-heading font-bold ${pctChange > 0 ? "text-red-500" : "text-green-600"}`}
                  >
                    {pctChange > 0 ? "+" : ""}
                    {pctChange.toFixed(0)}%
                  </p>
                </div>
              );
            })()}

          {/* Comparison table */}
          {comparisonData.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border overflow-x-auto">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
                Category Breakdown (avg/month)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-dark-border">
                    <th className="text-left text-xs text-gray-400 dark:text-dark-muted py-2 pr-3">
                      Category
                    </th>
                    {activeContexts.map(({ ctx, index }) => (
                      <th
                        key={ctx.id}
                        className="text-right text-xs py-2 px-2"
                        style={{ color: COLORS[index] }}
                      >
                        {ctx.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row) => (
                    <tr
                      key={row.name}
                      className="border-b border-gray-50 dark:border-dark-border/50"
                    >
                      <td className="text-navy dark:text-dark-text py-2 pr-3">
                        {categories?.find((c) => c.name === row.name)?.icon}{" "}
                        {row.name}
                      </td>
                      {activeContexts.map(({ ctx }) => (
                        <td
                          key={ctx.id}
                          className="text-right font-mono-amount text-navy dark:text-dark-text py-2 px-2"
                        >
                          {row[ctx.name] > 0
                            ? formatAmount(row[ctx.name], compareSym)
                            : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Category comparison bar chart */}
          {comparisonData.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
                Visual Comparison
              </h3>
              <ResponsiveContainer
                width="100%"
                height={Math.max(250, comparisonData.length * 30)}
              >
                <BarChart data={comparisonData} layout="vertical">
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="#888"
                    tickFormatter={(v) =>
                      `${compareSym}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                    }
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 11 }}
                    stroke="#888"
                    width={80}
                  />
                  <Tooltip formatter={(v) => formatAmount(v, compareSym)} />
                  <Legend />
                  {activeContexts.map(({ ctx, index }) => (
                    <Bar
                      key={ctx.id}
                      dataKey={ctx.name}
                      fill={COLORS[index]}
                      radius={[0, 4, 4, 0]}
                      barSize={12}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Insights */}
          {insights.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
                Key Insights
              </h3>
              <div className="space-y-2">
                {insights.map((msg, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-coral flex-shrink-0 mt-0.5">💡</span>
                    <span className="text-navy dark:text-dark-text">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Biggest Differences */}
          {differences.length > 0 && (
            <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
              <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
                Biggest Differences
              </h3>
              <div className="space-y-3">
                {differences.map((d) => (
                  <div
                    key={d.category}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-navy dark:text-dark-text font-medium flex-1">
                      {d.category}
                    </span>
                    <span
                      className={`font-mono-amount font-medium ${d.diff > 0 ? "text-red-500" : "text-green-600"}`}
                    >
                      {d.diff > 0 ? "+" : ""}
                      {d.pct}%
                    </span>
                    <span className="text-gray-400 dark:text-dark-muted font-mono-amount">
                      {formatAmount(Math.abs(d.diff), compareSym)}
                      {d.diff > 0 ? " higher" : " lower"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeContexts.length < 2 && (
        <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
          <p className="text-4xl mb-2">🔄</p>
          <p className="text-sm">
            Select at least two contexts above to compare them
          </p>
        </div>
      )}
    </div>
  );
}
