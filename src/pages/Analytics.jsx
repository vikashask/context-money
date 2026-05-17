import {
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import {
  formatAmount,
  getCategoryTotals,
  getExpensesForRange,
  getFinancialHealth,
  getMonthlyTotals,
} from "../utils";

const RANGES = [
  { label: "This Month", value: "month" },
  { label: "3 Months", value: "3m" },
  { label: "6 Months", value: "6m" },
  { label: "This Year", value: "year" },
];

export default function Analytics() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [range, setRange] = useState("month");
  const [expenses, setExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [annualData, setAnnualData] = useState(null);

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  useEffect(() => {
    if (!activeContextId) return;
    const now = new Date();
    let start, end;
    switch (range) {
      case "3m":
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case "6m":
        start = startOfMonth(subMonths(now, 5));
        end = endOfMonth(now);
        break;
      case "year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      default:
        start = startOfMonth(now);
        end = endOfMonth(now);
    }
    getExpensesForRange(activeContextId, start, end).then(setExpenses);
    const monthCount =
      range === "year" ? 12 : range === "6m" ? 6 : range === "3m" ? 3 : 1;
    getMonthlyTotals(activeContextId, monthCount).then(setMonthlyData);
  }, [activeContextId, range]);

  // Annual summary data
  useEffect(() => {
    if (!activeContextId) return;
    getMonthlyTotals(activeContextId, 12).then((data) => {
      const totals = data.map((m) => m.total);
      const totalSpent = totals.reduce((s, v) => s + v, 0);
      const activeMonths = totals.filter((t) => t > 0);
      const avgMonthly =
        activeMonths.length > 0 ? totalSpent / activeMonths.length : 0;
      const maxMonth = data.reduce(
        (best, m) => (m.total > (best?.total || 0) ? m : best),
        data[0],
      );
      const minMonth = data
        .filter((m) => m.total > 0)
        .reduce(
          (best, m) => (m.total < (best?.total || Infinity) ? m : best),
          data[0],
        );
      const allExpenses = data.flatMap((m) => m.expenses);
      const catTotals = getCategoryTotals(allExpenses);
      const topCategory = Object.entries(catTotals).sort(
        (a, b) => b[1] - a[1],
      )[0];
      setAnnualData({
        totalSpent,
        avgMonthly,
        maxMonth,
        minMonth,
        topCategory,
        data,
      });
    });
  }, [activeContextId]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const catTotals = getCategoryTotals(expenses);
  const monthlyIncome = context?.monthlyIncome || 0;
  const savingsRate =
    monthlyIncome > 0
      ? ((monthlyIncome - total / Math.max(monthlyData.length, 1)) /
          monthlyIncome) *
        100
      : 0;

  const pieData = Object.entries(catTotals)
    .map(([name, value]) => {
      const cat = categories?.find((c) => c.name === name);
      return {
        name,
        value,
        color: cat?.color || "#6b7280",
        icon: cat?.icon || "📦",
      };
    })
    .sort((a, b) => b.value - a.value);

  // Daily spending chart data (for current month view)
  const dailyChartData = useMemo(() => {
    if (range !== "month" || !expenses.length) return [];
    const now = new Date();
    const days = eachDayOfInterval({
      start: startOfMonth(now),
      end: now <= endOfMonth(now) ? now : endOfMonth(now),
    });
    let running = 0;
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayExpenses = expenses.filter((e) => e.date === dateStr);
      const dayTotal = dayExpenses.reduce((s, e) => s + e.amount, 0);
      running += dayTotal;
      const entry = { day: format(day, "dd"), total: dayTotal, running };
      // Category breakdown for stacked bars
      if (categories) {
        categories.forEach((cat) => {
          entry[cat.name] = dayExpenses
            .filter((e) => e.category === cat.name)
            .reduce((s, e) => s + e.amount, 0);
        });
      }
      return entry;
    });
  }, [expenses, categories, range]);

  // Monthly trend with income line
  const trendData = useMemo(() => {
    return monthlyData.map((m) => ({
      name: m.monthShort,
      spent: m.total,
      income: monthlyIncome,
    }));
  }, [monthlyData, monthlyIncome]);

  // Savings by month for gauge
  const monthlySavingsData = useMemo(() => {
    return monthlyData.map((m) => {
      const savings = monthlyIncome - m.total;
      const rate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
      return {
        name: m.monthShort,
        savings: Math.max(0, savings),
        rate: Math.max(0, rate),
      };
    });
  }, [monthlyData, monthlyIncome]);

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
  const health = getFinancialHealth(
    savingsRate,
    catTotals,
    total,
    monthlyTotals,
  );

  // Filter expenses by selected category
  const filteredExpenses = selectedCategory
    ? expenses.filter((e) => e.category === selectedCategory)
    : [];

  // Color-coded top categories for daily chart
  const dailyBarCategories = useMemo(() => {
    return topCategories.slice(0, 4);
  }, [topCategories]);

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
        <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
          Analytics
        </h1>
      </div>

      {/* Range selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => {
              setRange(r.value);
              setSelectedCategory(null);
            }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === r.value
                ? "bg-coral text-white"
                : "bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border"
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
          <p
            className="text-sm font-medium text-navy dark:text-dark-text"
            style={{ color: health.color }}
          >
            {health.level.charAt(0).toUpperCase() + health.level.slice(1)}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-muted">
            {health.text}
          </p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Total</p>
          <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
            {formatAmount(total, sym)}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">
            Daily Avg
          </p>
          <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
            {formatAmount(dailyAvg, sym)}
          </p>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-xl p-3 border border-gray-100 dark:border-dark-border text-center">
          <p className="text-xs text-gray-400 dark:text-dark-muted">Savings</p>
          <p
            className={`text-lg font-heading font-bold font-mono-amount ${savingsRate > 30 ? "text-green-600" : savingsRate > 15 ? "text-yellow-500" : "text-red-500"}`}
          >
            {savingsRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Daily Spending Chart (current month only) */}
      {range === "month" && dailyChartData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Daily Spending
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={dailyChartData}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                stroke="#888"
                interval={2}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                stroke="#888"
                tickFormatter={(v) =>
                  `${sym}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                stroke="#ccc"
                tickFormatter={(v) =>
                  `${sym}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`
                }
              />
              <Tooltip
                formatter={(v, name) => [
                  formatAmount(v, sym),
                  name === "running" ? "Running Total" : name,
                ]}
              />
              {dailyBarCategories.map((cat) => (
                <Bar
                  key={cat.name}
                  yAxisId="left"
                  dataKey={cat.name}
                  stackId="daily"
                  fill={cat.color}
                  radius={0}
                />
              ))}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="running"
                stroke="#E85D4A"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            </ComposedChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {dailyBarCategories.map((cat) => (
              <span
                key={cat.name}
                className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-dark-muted"
              >
                <span
                  className="w-2 h-2 rounded-sm"
                  style={{ backgroundColor: cat.color }}
                />{" "}
                {cat.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-dark-muted">
              <span className="w-4 border-t-2 border-dashed border-coral" />{" "}
              Running Total
            </span>
          </div>
        </div>
      )}

      {/* Interactive Category Donut */}
      {pieData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Category Breakdown
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="ml-2 text-xs text-coral hover:text-coral-light"
              >
                ✕ Clear filter
              </button>
            )}
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  onClick={(_, index) => {
                    const cat = pieData[index]?.name;
                    setSelectedCategory(selectedCategory === cat ? null : cat);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.color}
                      opacity={
                        selectedCategory && selectedCategory !== entry.name
                          ? 0.3
                          : 1
                      }
                      stroke={
                        selectedCategory === entry.name ? "#1a1a2e" : "none"
                      }
                      strokeWidth={selectedCategory === entry.name ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatAmount(v, sym)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 w-full md:w-auto">
              {pieData.map((d) => (
                <button
                  key={d.name}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === d.name ? null : d.name,
                    )
                  }
                  className={`flex items-center gap-2 text-sm w-full text-left rounded-lg px-2 py-1 transition-colors ${
                    selectedCategory === d.name
                      ? "bg-gray-100 dark:bg-dark-border"
                      : "hover:bg-gray-50 dark:hover:bg-dark-border/50"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-navy dark:text-dark-text">
                    {d.icon} {d.name}
                  </span>
                  <span className="ml-auto font-mono-amount text-gray-500 dark:text-dark-muted">
                    {((d.value / total) * 100).toFixed(0)}%
                  </span>
                  <span className="font-mono-amount text-navy dark:text-dark-text font-medium">
                    {formatAmount(d.value, sym)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Filtered expenses when category is selected */}
          {selectedCategory && filteredExpenses.length > 0 && (
            <div className="mt-4 border-t border-gray-100 dark:border-dark-border pt-3">
              <p className="text-xs text-gray-400 dark:text-dark-muted mb-2">
                {filteredExpenses.length} expenses in {selectedCategory}
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filteredExpenses.slice(0, 20).map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <span className="text-navy dark:text-dark-text">
                        {e.note || e.category}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-dark-muted ml-2">
                        {format(new Date(e.date), "dd MMM")}
                      </span>
                    </div>
                    <span className="font-mono-amount font-medium text-navy dark:text-dark-text flex-shrink-0 ml-2">
                      {formatAmount(e.amount, sym)}
                    </span>
                  </div>
                ))}
                {filteredExpenses.length > 20 && (
                  <p className="text-xs text-gray-400 dark:text-dark-muted">
                    +{filteredExpenses.length - 20} more
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spending Trend with Income Line */}
      {trendData.length > 1 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Spending vs Income Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={trendData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#888"
                tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v) => formatAmount(v, sym)} />
              <Legend />
              <Bar
                dataKey="spent"
                name="Spent"
                fill="#E85D4A"
                radius={[6, 6, 0, 0]}
                animationDuration={800}
              />
              {monthlyIncome > 0 && (
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#22c55e"
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Savings Tracker */}
      {monthlyIncome > 0 && monthlySavingsData.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Monthly Savings
          </h3>
          <div className="flex items-center justify-center mb-4">
            <SavingsGauge rate={savingsRate} />
          </div>
          {monthlySavingsData.length > 1 && (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={monthlySavingsData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#888" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#888"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip
                  formatter={(v, name) => [
                    name === "rate" ? `${v.toFixed(0)}%` : formatAmount(v, sym),
                    name === "rate" ? "Savings Rate" : "Savings",
                  ]}
                />
                <Bar dataKey="rate" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Annual Summary */}
      {annualData && annualData.totalSpent > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Annual Summary ({new Date().getFullYear()})
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-dark-muted">
                Total This Year
              </p>
              <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
                {formatAmount(annualData.totalSpent, sym)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-dark-muted">
                Avg Monthly
              </p>
              <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
                {formatAmount(annualData.avgMonthly, sym)}
              </p>
            </div>
            {annualData.maxMonth && (
              <div>
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  Highest Month
                </p>
                <p className="text-sm font-medium text-red-500">
                  {annualData.maxMonth.monthShort} —{" "}
                  {formatAmount(annualData.maxMonth.total, sym)}
                </p>
              </div>
            )}
            {annualData.minMonth && annualData.minMonth.total > 0 && (
              <div>
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  Lowest Month
                </p>
                <p className="text-sm font-medium text-green-600">
                  {annualData.minMonth.monthShort} —{" "}
                  {formatAmount(annualData.minMonth.total, sym)}
                </p>
              </div>
            )}
            {annualData.topCategory && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  Top Category
                </p>
                <p className="text-sm font-medium text-navy dark:text-dark-text">
                  {
                    categories?.find(
                      (c) => c.name === annualData.topCategory[0],
                    )?.icon
                  }{" "}
                  {annualData.topCategory[0]} —{" "}
                  {formatAmount(annualData.topCategory[1], sym)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Trend Lines */}
      {categoryTrendData.length > 1 && topCategories.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Category Trends
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={categoryTrendData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#888"
                tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v) => formatAmount(v, sym)} />
              <Legend />
              {topCategories.map((cat) => (
                <Line
                  key={cat.name}
                  type="monotone"
                  dataKey={cat.name}
                  stroke={cat.color}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Spending Categories */}
      {topCategories.length > 0 && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-3">
            Top Spending Categories
          </h3>
          <div className="space-y-3">
            {topCategories.map((cat, i) => (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-400 dark:text-dark-muted w-5">
                  {i + 1}.
                </span>
                <span className="text-lg">{cat.icon}</span>
                <span className="text-sm font-medium text-navy dark:text-dark-text flex-1">
                  {cat.name}
                </span>
                <span className="text-sm text-gray-400 dark:text-dark-muted font-mono-amount">
                  {((cat.value / total) * 100).toFixed(0)}%
                </span>
                <span className="text-sm font-semibold font-mono-amount text-navy dark:text-dark-text">
                  {formatAmount(cat.value, sym)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-dark-muted">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-sm">
            No data for this period. Add some expenses first!
          </p>
        </div>
      )}
    </div>
  );
}

// Savings Rate Gauge Component
function SavingsGauge({ rate }) {
  const clampedRate = Math.max(0, Math.min(100, rate));
  const angle = (clampedRate / 100) * 180;
  const color =
    clampedRate > 30 ? "#22c55e" : clampedRate > 15 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-40 h-20">
      <svg viewBox="0 0 200 110" className="w-full h-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="16"
          strokeLinecap="round"
          className="dark:stroke-dark-border"
        />
        {/* Filled arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * 251.2} 251.2`}
        />
        {/* Center text */}
        <text
          x="100"
          y="90"
          textAnchor="middle"
          className="fill-navy dark:fill-dark-text"
          fontSize="28"
          fontWeight="700"
        >
          {clampedRate.toFixed(0)}%
        </text>
        <text
          x="100"
          y="108"
          textAnchor="middle"
          className="fill-gray-400"
          fontSize="11"
        >
          savings rate
        </text>
      </svg>
    </div>
  );
}
