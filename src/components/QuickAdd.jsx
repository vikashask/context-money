import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { parseExpenseInput } from '../utils';

export default function QuickAdd({ onAdded }) {
  const { activeContextId, currency } = useStore();
  const [input, setInput] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categories || !activeContextId) return;

    const parsed = parseExpenseInput(input, categories);
    if (!parsed) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    if (!parsed.category) {
      setPendingExpense(parsed);
      setShowCategoryPicker(true);
      return;
    }

    await addExpense(parsed);
  };

  const addExpense = async (expense) => {
    await db.expenses.add({
      contextId: activeContextId,
      amount: expense.amount,
      category: expense.category,
      note: expense.note || '',
      date: new Date().toISOString().split('T')[0],
      isRecurring: false,
      createdAt: new Date(),
    });
    setInput('');
    setShowCategoryPicker(false);
    setPendingExpense(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    onAdded?.();
  };

  const selectCategory = (catName) => {
    if (pendingExpense) {
      addExpense({ ...pendingExpense, category: catName });
    }
  };

  const sym = getCurrencySymbol(currency);

  return (
    <div className={`relative ${flash ? 'animate-flash-green' : ''}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className={`flex-1 relative ${shake ? 'animate-shake' : ''}`}>
          <input
            id="quick-add-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Type "${sym}500 food" or "1200 rent"`}
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral text-sm md:text-base"
            autoComplete="off"
            aria-label="Quick add expense"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-3 bg-coral hover:bg-coral-light text-white rounded-xl font-medium text-sm transition-colors active:scale-95 min-w-[44px]"
          aria-label="Add expense"
        >
          Add
        </button>
      </form>

      {showCategoryPicker && categories && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-3 z-30 animate-fade-in-up">
          <p className="text-xs text-gray-500 dark:text-dark-muted mb-2">Select a category:</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-dark-border hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
              >
                <span>{cat.icon}</span>
                <span className="text-navy dark:text-dark-text">{cat.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowCategoryPicker(false); setPendingExpense(null); }}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
