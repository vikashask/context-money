import { useState } from 'react';
import { db, DEFAULT_EXPENSES_TEMPLATE, DEFAULT_CATEGORIES, addDefaultExpenses } from '../db';
import { useStore, getCurrencySymbol, CURRENCIES } from '../store';

export default function Onboarding() {
  const { setActiveContextId, setHasOnboarded, currency, setCurrency } = useStore();
  const [step, setStep] = useState(1);
  const [contextName, setContextName] = useState('');
  const [income, setIncome] = useState('50000');
  const [budget, setBudget] = useState('35000');
  const [contextId, setContextId] = useState(null);
  const [defaultExpenses, setDefaultExpenses] = useState(
    DEFAULT_EXPENSES_TEMPLATE.map((e, i) => ({ ...e, id: i, enabled: true }))
  );
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpCategory, setNewExpCategory] = useState('Food');
  const [newExpNote, setNewExpNote] = useState('');
  const sym = getCurrencySymbol(currency);

  const handleCreateContext = async () => {
    if (!contextName.trim()) return;
    const id = await db.contexts.add({
      name: contextName.trim(),
      currency: currency,
      monthlyIncome: Number(income) || 0,
      monthlyBudget: Number(budget) || 0,
      createdAt: new Date(),
      isArchived: 0,
    });
    setActiveContextId(id);
    setContextId(id);
    setStep(3);
  };

  const toggleExpense = (id) => {
    setDefaultExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e))
    );
  };

  const updateExpenseAmount = (id, amount) => {
    setDefaultExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: Number(amount) || 0 } : e))
    );
  };

  const updateExpenseNote = (id, note) => {
    setDefaultExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, note } : e))
    );
  };

  const removeExpense = (id) => {
    setDefaultExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const addCustomExpense = () => {
    if (!newExpAmount || Number(newExpAmount) <= 0) return;
    const newId = Math.max(0, ...defaultExpenses.map((e) => e.id)) + 1;
    setDefaultExpenses((prev) => [
      ...prev,
      { id: newId, category: newExpCategory, amount: Number(newExpAmount), note: newExpNote, isRecurring: false, enabled: true },
    ]);
    setNewExpAmount('');
    setNewExpNote('');
  };

  const handleFinish = async () => {
    const enabled = defaultExpenses.filter((e) => e.enabled && e.amount > 0);
    if (enabled.length > 0 && contextId) {
      await addDefaultExpenses(contextId, enabled);
    }
    setHasOnboarded(true);
  };

  const enabledTotal = defaultExpenses
    .filter((e) => e.enabled && e.amount > 0)
    .reduce((s, e) => s + e.amount, 0);

  const examples = ['Chennai Life', 'Bangalore Job', 'Dubai Onsite', 'Remote Phase'];

  const getCatIcon = (catName) => {
    return DEFAULT_CATEGORIES.find((c) => c.name === catName)?.icon || '📦';
  };

  return (
    <div className="min-h-screen bg-cream dark:bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${
              s < step ? 'bg-coral w-8' : s === step ? 'bg-coral w-8' : 'bg-gray-300 dark:bg-dark-border w-4'
            }`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-navy dark:text-white mb-2 text-center">
              Welcome to <span className="text-coral">ContextMoney</span>
            </h1>
            <p className="text-gray-500 dark:text-dark-muted text-center mb-8 text-sm">
              Track your expenses across different phases of life.<br />Everything stays on your device — private and offline.
            </p>

            <label className="block text-sm font-medium text-navy dark:text-dark-text mb-2">
              Name your first life context
            </label>
            <input
              type="text"
              value={contextName}
              onChange={(e) => setContextName(e.target.value)}
              placeholder="e.g., Chennai Life"
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral/40 mb-3"
              autoFocus
            />
            <div className="flex flex-wrap gap-2 mb-6">
              {examples.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setContextName(ex)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                    contextName === ex
                      ? 'bg-coral/10 border border-coral text-coral'
                      : 'bg-gray-100 dark:bg-dark-border text-gray-600 dark:text-dark-muted hover:bg-gray-200'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>

            <button
              onClick={() => contextName.trim() && setStep(2)}
              disabled={!contextName.trim()}
              className="w-full py-3 bg-coral hover:bg-coral-light disabled:opacity-40 text-white rounded-xl font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-heading font-bold text-navy dark:text-white mb-2 text-center">
              Set your monthly finances
            </h2>
            <p className="text-gray-500 dark:text-dark-muted text-center mb-6 text-sm">
              This helps us show savings and budget insights
            </p>

            <label className="block text-sm font-medium text-navy dark:text-dark-text mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text mb-4 focus:outline-none focus:ring-2 focus:ring-coral/40"
            >
              {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
                <option key={code} value={code}>{symbol} {code} — {name}</option>
              ))}
            </select>

            <label className="block text-sm font-medium text-navy dark:text-dark-text mb-1">Monthly income</label>
            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="50000"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
            </div>

            <label className="block text-sm font-medium text-navy dark:text-dark-text mb-1">Monthly budget</label>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">{sym}</span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="35000"
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral/40"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-3 border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted rounded-xl font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-border"
              >
                Back
              </button>
              <button
                onClick={handleCreateContext}
                className="flex-1 py-3 bg-coral hover:bg-coral-light text-white rounded-xl font-medium transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-xl font-heading font-bold text-navy dark:text-white mb-1 text-center">
              Review your monthly expenses
            </h2>
            <p className="text-gray-500 dark:text-dark-muted text-center mb-4 text-sm">
              We've added typical city living expenses. Edit amounts, remove what doesn't apply, or add your own.
            </p>

            {/* Summary bar */}
            <div className="bg-white dark:bg-dark-card rounded-xl p-3 mb-4 border border-gray-100 dark:border-dark-border flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 dark:text-dark-muted">Monthly total</p>
                <p className="text-lg font-heading font-bold text-navy dark:text-white font-mono-amount">
                  {sym}{enabledTotal.toLocaleString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-dark-muted">Savings estimate</p>
                <p className={`text-lg font-heading font-bold font-mono-amount ${
                  (Number(income) || 0) - enabledTotal > 0 ? 'text-green-600' : 'text-red-500'
                }`}>
                  {sym}{((Number(income) || 0) - enabledTotal).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Expense list */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 mb-4">
              {defaultExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                    exp.enabled
                      ? 'bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border'
                      : 'bg-gray-50 dark:bg-dark/50 border-gray-100 dark:border-dark-border opacity-50'
                  }`}
                >
                  <button
                    onClick={() => toggleExpense(exp.id)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      exp.enabled
                        ? 'bg-coral border-coral text-white'
                        : 'border-gray-300 dark:border-dark-border'
                    }`}
                    aria-label={exp.enabled ? 'Disable' : 'Enable'}
                  >
                    {exp.enabled && <span className="text-xs">✓</span>}
                  </button>
                  <span className="text-lg flex-shrink-0">{getCatIcon(exp.category)}</span>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={exp.note}
                      onChange={(e) => updateExpenseNote(exp.id, e.target.value)}
                      className="w-full text-sm text-navy dark:text-dark-text bg-transparent border-none p-0 focus:outline-none truncate"
                      placeholder="Description"
                    />
                    <p className="text-[10px] text-gray-400 dark:text-dark-muted">
                      {exp.category} {exp.isRecurring ? '• Recurring' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">{sym}</span>
                    <input
                      type="number"
                      value={exp.amount}
                      onChange={(e) => updateExpenseAmount(exp.id, e.target.value)}
                      className="w-16 text-sm text-right font-mono-amount font-semibold text-navy dark:text-dark-text bg-transparent border-none p-0 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeExpense(exp.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add custom expense */}
            <div className="bg-gray-50 dark:bg-dark-card/50 rounded-xl p-3 mb-4 border border-dashed border-gray-300 dark:border-dark-border">
              <p className="text-xs text-gray-500 dark:text-dark-muted mb-2 font-medium">Add your own expense</p>
              <div className="flex gap-2">
                <select
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40 w-24"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-20 px-2 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <input
                  type="text"
                  value={newExpNote}
                  onChange={(e) => setNewExpNote(e.target.value)}
                  placeholder="Note"
                  className="flex-1 px-2 py-1.5 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                  onKeyDown={(e) => e.key === 'Enter' && addCustomExpense()}
                />
                <button
                  onClick={addCustomExpense}
                  className="px-3 py-1.5 bg-coral text-white rounded-lg text-xs font-medium hover:bg-coral-light transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-5 py-3 border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-muted rounded-xl font-medium transition-colors hover:bg-gray-50 dark:hover:bg-dark-border"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                className="flex-1 py-3 bg-coral hover:bg-coral-light text-white rounded-xl font-medium transition-colors"
              >
                🚀 Start Tracking
              </button>
            </div>

            <button
              onClick={() => { setDefaultExpenses([]); handleFinish(); }}
              className="w-full mt-2 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip — I'll add expenses manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
