import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { getCurrentMonthExpenses, getCategoryTotals, formatAmount, generateInsights, getExpensesForRange } from '../utils';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import QuickAdd from '../components/QuickAdd';

export default function Dashboard() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addCategory, setAddCategory] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addDate, setAddDate] = useState(new Date().toISOString().split('T')[0]);

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId]
  );

  const expenses = useLiveQuery(
    () => (activeContextId ? getCurrentMonthExpenses(activeContextId) : []),
    [activeContextId, refreshKey]
  );

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const [insights, setInsights] = useState([]);

  useEffect(() => {
    if (!expenses || !context || !activeContextId || !categories) return;
    const now = new Date();
    const prevStart = startOfMonth(subMonths(now, 1));
    const prevEnd = endOfMonth(subMonths(now, 1));
    getExpensesForRange(activeContextId, prevStart, prevEnd).then((prev) => {
      setInsights(generateInsights(expenses, context.monthlyBudget, context.monthlyIncome, prev, categories));
    });
  }, [expenses, context, activeContextId, categories]);

  const recentExpenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses.where('contextId').equals(activeContextId).reverse().sortBy('createdAt').then((arr) => arr.slice(0, 15))
        : [],
    [activeContextId, refreshKey]
  );

  if (!context) {
    return (
      <div className="text-center py-20 text-gray-400 dark:text-dark-muted">
        <p className="text-5xl mb-4">💰</p>
        <p className="text-lg font-heading font-medium text-navy dark:text-white mb-2">No context selected</p>
        <p className="text-sm mb-4">Create a new context to start tracking expenses</p>
      </div>
    );
  }

  const totalSpent = expenses?.reduce((s, e) => s + e.amount, 0) || 0;
  const budgetRemaining = context.monthlyBudget - totalSpent;
  const budgetPct = context.monthlyBudget > 0 ? Math.min((totalSpent / context.monthlyBudget) * 100, 100) : 0;
  const savingsRate = context.monthlyIncome > 0 ? (((context.monthlyIncome - totalSpent) / context.monthlyIncome) * 100) : 0;

  const handleDelete = async (id) => {
    await db.expenses.delete(id);
    setConfirmDeleteId(null);
    setRefreshKey((k) => k + 1);
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setEditAmount(String(expense.amount));
    setEditNote(expense.note || '');
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
    setAddAmount('');
    setAddCategory('');
    setAddNote('');
    setAddDate(new Date().toISOString().split('T')[0]);
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

      {/* Monthly Summary */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border shadow-sm animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500 dark:text-dark-muted">
            {format(new Date(), 'MMMM yyyy')}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-dark-border text-gray-500 dark:text-dark-muted">
            {context.name}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 dark:text-dark-muted">Total Spent</p>
            <p className="text-2xl font-heading font-bold text-navy dark:text-white animate-count-up font-mono-amount">
              {formatAmount(totalSpent, sym)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-dark-muted">Budget Left</p>
            <p className={`text-2xl font-heading font-bold animate-count-up font-mono-amount ${budgetRemaining < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
              {formatAmount(Math.abs(budgetRemaining), sym)}
              {budgetRemaining < 0 && <span className="text-sm ml-1">over</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-dark-muted">Income</p>
            <p className="text-lg font-heading font-semibold text-navy dark:text-dark-text font-mono-amount">
              {formatAmount(context.monthlyIncome, sym)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-dark-muted">Savings Rate</p>
            <p className={`text-lg font-heading font-semibold font-mono-amount ${savingsRate > 30 ? 'text-green-600 dark:text-green-400' : savingsRate > 15 ? 'text-yellow-500' : 'text-red-500'}`}>
              {savingsRate.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Budget progress bar */}
        {context.monthlyBudget > 0 && (
          <div>
            <div className="flex justify-between text-xs text-gray-400 dark:text-dark-muted mb-1">
              <span>{budgetPct.toFixed(0)}% used</span>
              <span>{formatAmount(context.monthlyBudget, sym)} budget</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all animate-fill-bar ${
                  budgetPct >= 100 ? 'bg-red-500' : budgetPct >= 80 ? 'bg-yellow-500' : 'bg-green-500'
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
                <span key={cat} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-gray-50 dark:bg-dark-border text-gray-600 dark:text-dark-muted">
                  {c?.icon} {cat} {((amt / totalSpent) * 100).toFixed(0)}%
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Smart Nudges */}
      {insights.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex-shrink-0 snap-start w-[260px] p-3 rounded-xl border text-sm ${
                ins.type === 'danger' ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300' :
                ins.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300' :
                'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
              }`}
            >
              <span className="mr-1.5">
                {ins.type === 'danger' ? '🔴' : ins.type === 'warning' ? '🟡' : '💡'}
              </span>
              {ins.text}
            </div>
          ))}
        </div>
      )}

      {/* Recent Expenses */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">Recent Expenses</h3>
          <button
            onClick={() => { setShowAddModal(true); if (categories?.length > 0 && !addCategory) setAddCategory(categories[0].name); }}
            className="flex items-center gap-1 text-xs font-medium text-coral hover:text-coral-light transition-colors"
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
                  <div key={expense.id} className="px-4 py-3 bg-coral/5 dark:bg-coral/10 border-l-3 border-coral">
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="text-sm px-2 py-1 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                      >
                        {categories?.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
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
                      <button onClick={saveEdit} className="px-3 py-1 bg-coral text-white rounded-lg text-xs font-medium hover:bg-coral-light">Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => startEdit(expense)} role="button" tabIndex={0}>
                    <span className="text-xl flex-shrink-0">{cat?.icon || '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy dark:text-dark-text truncate">
                        {expense.category}
                        {expense.isRecurring && <span className="ml-1.5 text-[10px] text-coral bg-coral/10 px-1 py-0.5 rounded">recurring</span>}
                      </p>
                      {expense.note && (
                        <p className="text-xs text-gray-400 dark:text-dark-muted truncate">{expense.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono-amount text-navy dark:text-dark-text">
                        {formatAmount(expense.amount, sym)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-dark-muted">
                        {format(new Date(expense.date), 'dd MMM')}
                      </p>
                    </div>
                    {isConfirmingDelete ? (
                      <div className="flex gap-1 animate-fade-in-up">
                        <button onClick={() => handleDelete(expense.id)} className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-medium">Yes</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-dark-muted rounded-lg text-[10px]">No</button>
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
            <p className="text-xs mb-4">Use the quick-add bar above or tap the button below</p>
            <button
              onClick={() => { setShowAddModal(true); if (categories?.length > 0 && !addCategory) setAddCategory(categories[0].name); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-light transition-colors"
            >
              <span>+</span> Add your first expense
            </button>
          </div>
        )}
      </div>

      {/* Floating Add Button (mobile) */}
      <button
        onClick={() => { setShowAddModal(true); if (categories?.length > 0 && !addCategory) setAddCategory(categories[0].name); }}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-coral hover:bg-coral-light text-white rounded-full shadow-lg shadow-coral/25 flex items-center justify-center text-2xl transition-all active:scale-90 z-40 hover:shadow-xl"
        aria-label="Add expense"
      >
        +
      </button>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-md border-t md:border border-gray-200 dark:border-dark-border animate-fade-in-up max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white">Add Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-gray-400 hover:text-gray-600" data-modal-close>✕</button>
            </div>
            <form onSubmit={handleAddExpense} className="space-y-3">
              {/* Amount - big and prominent */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">{sym}</span>
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
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-2">Category</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {categories?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setAddCategory(c.name)}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all ${
                        addCategory === c.name
                          ? 'bg-coral/10 border-2 border-coral text-coral scale-[1.02]'
                          : 'bg-gray-50 dark:bg-dark border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border'
                      }`}
                    >
                      <span className="text-lg">{c.icon}</span>
                      <span className="text-[10px] font-medium leading-tight">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">Note (optional)</label>
                <input
                  type="text"
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                  placeholder="What was this for?"
                  className="w-full px-3 py-2.5 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">Date</label>
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
                className="w-full py-3 bg-coral hover:bg-coral-light disabled:opacity-40 text-white rounded-xl font-medium transition-colors text-sm mt-2"
              >
                Add {addAmount && addCategory ? `${formatAmount(Number(addAmount), sym)} to ${addCategory}` : 'Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
