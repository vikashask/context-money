import { endOfMonth, format, startOfMonth, subMonths } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import Achievements from "../components/Achievements";
import FinancialGoals from "../components/FinancialGoals";
import QuickAdd from "../components/QuickAdd";
import SpendingHeatmap from "../components/SpendingHeatmap";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import {
  formatAmount,
  generateInsights,
  getCategoryTotals,
  getCurrentMonthExpenses,
  getExpensesForRange,
} from "../utils";

export default function Dashboard() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addDate, setAddDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId],
  );

  const expenses = useLiveQuery(
    () => (activeContextId ? getCurrentMonthExpenses(activeContextId) : []),
    [activeContextId, refreshKey],
  );

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const [insights, setInsights] = useState([]);

  useEffect(() => {
    if (!expenses || !context || !activeContextId || !categories) return;
    const now = new Date();
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));
    getExpensesForRange(activeContextId, prevStart, prevEnd).then((prev) => {
      setInsights(
        generateInsights(
          expenses,
          context.monthlyBudget,
          context.monthlyIncome,
          prev,
          categories,
        ),
      );
    });
  }, [expenses, context, activeContextId, categories]);

  const recentExpenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses
            .where("contextId")
            .equals(activeContextId)
            .reverse()
            .sortBy("createdAt")
            .then((arr) => arr.slice(0, 15))
        : [],
    [activeContextId, refreshKey],
  );

  if (!context) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
        <p className="text-5xl mb-4">💰</p>
        <p className="text-lg font-heading font-medium text-navy dark:text-white mb-2">
          No context selected
        </p>
        <p className="text-sm mb-4">
          Create a new context to start tracking expenses
        </p>
      </div>
    );
  }

  const totalSpent = expenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const budgetRemaining = context.monthlyBudget - totalSpent;
  const budgetPct =
    context.monthlyBudget > 0
      ? Math.min((totalSpent / context.monthlyBudget) * 100, 100)
      : 0;
  const savingsRate =
    context.monthlyIncome > 0
      ? ((context.monthlyIncome - totalSpent) / context.monthlyIncome) * 100
      : 0;

  const handleDelete = async (id) => {
    await db.expenses.delete(id);
    setConfirmDeleteId(null);
    setRefreshKey((k) => k + 1);
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
    setEditNote(expense.note || "");
    setEditCategory(expense.category);
  };

  const saveEdit = async () => {
    if (!editingId || !editAmount) return;
    await db.expenses.update(editingId, {
      amount: Number(editAmount),
      note: editNote,
      category: editCategory,
    });
    setEditingId(null);
    setRefreshKey((k) => k + 1);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!addAmount || !addCategory || !activeContextId) return;
    await db.expenses.add({
      contextId: activeContextId,
      amount: Number(addAmount),
      category: addCategory,
      note: addNote,
      date: addDate,
      isRecurring: false,
      createdAt: new Date(),
    });
    setAddAmount("");
    setAddCategory("");
    setAddNote("");
    setAddDate(new Date().toISOString().split("T")[0]);
    setShowAddModal(false);
    setRefreshKey((k) => k + 1);
  };

  // Group expenses by category for a nice summary
  const catTotals = getCategoryTotals(expenses || []);
  const topCats = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-4">
      {/* Quick Add */}
      <div className="sticky top-[57px] z-30 bg-cream dark:bg-dark pt-2 pb-2 -mx-4 px-4">
        <QuickAdd onAdded={() => setRefreshKey((k) => k + 1)} />
      </div>

      {/* Monthly Summary - Hero Card */}
      <div className="relative overflow-hidden rounded-2xl animate-fade-in-up card-elevated">
        {/* Gradient background */}
        <div className="absolute inset-0 gradient-card opacity-95" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent" />

        <div className="relative p-5 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white/80">
              {format(new Date(), "MMMM yyyy")}
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white/90 font-medium">
              {context.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-white/60 mb-0.5">Total Spent</p>
              <p className="text-2xl font-heading font-bold font-mono-amount">
                {formatAmount(totalSpent, sym)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-0.5">Budget Left</p>
              <p className="text-2xl font-heading font-bold font-mono-amount">
                {formatAmount(Math.abs(budgetRemaining), sym)}
                {budgetRemaining < 0 && (
                  <span className="text-sm ml-1 text-white/70">over</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-0.5">Income</p>
              <p className="text-lg font-heading font-semibold font-mono-amount text-white/90">
                {formatAmount(context.monthlyIncome, sym)}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/60 mb-0.5">Savings Rate</p>
              <p className="text-lg font-heading font-semibold font-mono-amount">
                <span
                  className={`px-2 py-0.5 rounded-md text-sm ${savingsRate > 30 ? "bg-green-500/30" : savingsRate > 15 ? "bg-yellow-500/30" : "bg-red-500/30"}`}
                >
                  {savingsRate.toFixed(0)}%
                </span>
              </p>
            </div>
          </div>

          {/* Budget progress bar */}
          {context.monthlyBudget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-white/60 mb-1.5">
                <span>{budgetPct.toFixed(0)}% used</span>
                <span>{formatAmount(context.monthlyBudget, sym)} budget</span>
              </div>
              <div className="h-2.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    budgetPct >= 100
                      ? "bg-red-300"
                      : budgetPct >= 80
                        ? "bg-yellow-300"
                        : "bg-white"
                  }`}
                  style={{ width: `${budgetPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Top categories mini bar */}
          {topCats.length > 0 && totalSpent > 0 && (
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {topCats.map(([cat, amt]) => {
                const c = categories?.find((c) => c.name === cat);
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-white/85"
                  >
                    {c?.icon} {cat} {((amt / totalSpent) * 100).toFixed(0)}%
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Smart Nudges */}
      {insights.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory fancy-scroll">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex-shrink-0 snap-start w-[260px] p-3.5 rounded-xl border text-sm backdrop-blur-sm stagger-item ${
                ins.type === "danger"
                  ? "bg-red-50/80 dark:bg-red-950/40 border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-300"
                  : ins.type === "warning"
                    ? "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300"
                    : "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300"
              }`}
            >
              <span className="mr-1.5 text-base">
                {ins.type === "danger"
                  ? "🔴"
                  : ins.type === "warning"
                    ? "🟡"
                    : "💡"}
              </span>
              {ins.text}
            </div>
          ))}
        </div>
      )}

      {/* Spending Heatmap */}
      <SpendingHeatmap />

      {/* Achievements & Streaks */}
      <Achievements />

      {/* Financial Goals */}
      <FinancialGoals />

      {/* Recent Expenses */}
      <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 dark:border-dark-border shadow-sm overflow-hidden card-elevated">
        <div className="px-5 pt-4 pb-2 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-navy dark:text-dark-text">
            Recent Expenses
          </h3>
          <button
            onClick={() => {
              setShowAddModal(true);
              if (categories?.length > 0 && !addCategory)
                setAddCategory(categories[0].name);
            }}
            className="flex items-center gap-1 text-xs font-semibold text-coral hover:text-coral-light transition-colors px-2.5 py-1 rounded-lg hover:bg-coral/5"
          >
            <span className="text-base leading-none">+</span> Add
          </button>
        </div>

        {recentExpenses && recentExpenses.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-dark-border">
            {recentExpenses.map((expense, i) => {
              const cat = categories?.find((c) => c.name === expense.category);
              const isEditing = editingId === expense.id;
              const isConfirmingDelete = confirmDeleteId === expense.id;

              if (isEditing) {
                return (
                  <div
                    key={expense.id}
                    className="px-4 py-3 bg-coral/5 dark:bg-coral/10 border-l-3 border-coral"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="text-sm px-2 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                      >
                        {categories?.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2">
                        <span className="text-xs text-gray-400">{sym}</span>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-20 text-sm py-1 text-right font-mono-amount font-semibold text-navy dark:text-dark-text bg-transparent border-none focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      placeholder="Note (optional)"
                      className="w-full text-xs px-2 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40 mb-2"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-3 py-1 bg-coral text-white rounded-lg text-xs font-medium hover:bg-coral-light"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-3 py-1 text-gray-500 text-xs hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors group"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1"
                    onClick={() => startEdit(expense)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="text-xl flex-shrink-0">
                      {cat?.icon || "📦"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy dark:text-dark-text truncate">
                        {expense.category}
                        {expense.isRecurring && (
                          <span className="ml-1.5 text-[10px] text-coral bg-coral/10 px-1 py-0.5 rounded">
                            recurring
                          </span>
                        )}
                      </p>
                      {expense.note && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted truncate">
                          {expense.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono-amount text-navy dark:text-dark-text">
                        {formatAmount(expense.amount, sym)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-dark-muted">
                        {format(new Date(expense.date), "dd MMM")}
                      </p>
                    </div>
                    {isConfirmingDelete ? (
                      <div className="flex gap-1 animate-fade-in-up">
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-medium"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-dark-muted rounded-lg text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(expense)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                          aria-label="Edit expense"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(expense.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          aria-label="Delete expense"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 dark:text-dark-muted">
            <p className="text-4xl mb-3">✨</p>
            <p className="text-sm font-medium mb-1">No expenses yet</p>
            <p className="text-xs mb-4">
              Use the quick-add bar above or tap the button below
            </p>
            <button
              onClick={() => {
                setShowAddModal(true);
                if (categories?.length > 0 && !addCategory)
                  setAddCategory(categories[0].name);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-light transition-colors"
            >
              <span>+</span> Add your first expense
            </button>
          </div>
        )}
      </div>

      {/* Floating Add Button (mobile) */}
      <button
        onClick={() => {
          setShowAddModal(true);
          if (categories?.length > 0 && !addCategory)
            setAddCategory(categories[0].name);
        }}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-gradient-to-br from-coral to-[#f7a072] hover:from-coral-light hover:to-[#f9b088] text-white rounded-full shadow-lg shadow-coral/30 flex items-center justify-center text-2xl transition-all active:scale-90 z-40 hover:shadow-xl hover:shadow-coral/40"
        aria-label="Add expense"
      >
        +
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-t-3xl md:rounded-2xl p-6 w-full md:max-w-md border-t md:border border-gray-200/50 dark:border-dark-border animate-slide-up max-h-[90vh] overflow-y-auto card-elevated"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white">
                Add Expense
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors"
                data-modal-close
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3">
              {/* Amount - big and prominent */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">
                    {sym}
                  </span>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-2xl font-heading font-bold text-navy dark:text-dark-text font-mono-amount focus:outline-none focus:ring-2 focus:ring-coral/40"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Category - grid of buttons */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-2">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {categories?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAddCategory(c.name)}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all ${
                        addCategory === c.name
                          ? "bg-coral/10 border-2 border-coral text-coral scale-[1.02]"
                          : "bg-gray-50 dark:bg-dark border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border"
                      }`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span className="text-[10px] font-medium leading-tight">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="What was this for?"
                  className="w-full px-3 py-2.5 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={addDate}
                  onChange={(e) => setAddDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
              </div>

              <button
                type="submit"
                disabled={!addAmount || !addCategory}
                className="w-full py-3.5 bg-gradient-to-r from-coral to-[#f7a072] hover:from-coral-light hover:to-[#f9b088] disabled:opacity-40 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-semibold transition-all text-sm mt-2 shadow-md shadow-coral/20"
              >
                Add{" "}
                {addAmount && addCategory
                  ? `${formatAmount(Number(addAmount), sym)} to ${addCategory}`
                  : "Expense"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
