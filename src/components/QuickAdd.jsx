import { endOfMonth, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useRef, useState } from "react";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import { formatAmount } from "../utils";
import { parseExpense } from "../utils/expenseParser";
import { useToast } from "./Toast";

export default function QuickAdd({ onAdded }) {
  const { activeContextId, currency } = useStore();
  const [input, setInput] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingExpense, setPendingExpense] = useState(null);
  const [flash, setFlash] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  const toast = useToast();

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!categories || !activeContextId) return;

    const results = parseExpense(input, categories);
    if (!results || results.length === 0) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    // Handle multiple expenses
    if (results.length > 1) {
      let addedCount = 0;
      for (const parsed of results) {
        if (parsed.category) {
          await addExpenseDirect(parsed);
          addedCount++;
        }
      }
      if (addedCount > 0) {
        setInput("");
        setFlash(true);
        setTimeout(() => setFlash(false), 500);
        toast.success(`${addedCount} expenses added`);
        onAdded?.();
        await checkBudget();
      }
      return;
    }

    const parsed = results[0];
    if (!parsed.category) {
      setPendingExpense(parsed);
      setShowCategoryPicker(true);
      return;
    }

    await addExpense(parsed);
  };

  const sym = getCurrencySymbol(currency);

  const addExpenseDirect = async (expense) => {
    await db.expenses.add({
      contextId: activeContextId,
      amount: expense.amount,
      category: expense.category,
      note: expense.note || "",
      date: expense.date || new Date().toISOString().split("T")[0],
      isRecurring: expense.isRecurring || false,
      tags: expense.tags || [],
      createdAt: new Date(),
    });
  };

  const addExpense = async (expense) => {
    await addExpenseDirect(expense);
    setInput("");
    setShowCategoryPicker(false);
    setPendingExpense(null);
    setFlash(true);
    setTimeout(() => setFlash(false), 500);
    toast.success(
      `${formatAmount(expense.amount, sym)} added to ${expense.category}`,
    );
    onAdded?.();
    await checkBudget();
  };

  const checkBudget = async () => {
    const context = await db.contexts.get(activeContextId);
    if (context?.monthlyBudget > 0) {
      const now = new Date();
      const monthExpenses = await db.expenses
        .where("contextId")
        .equals(activeContextId)
        .filter((e) => {
          const d = new Date(e.date);
          return d >= startOfMonth(now) && d <= endOfMonth(now);
        })
        .toArray();
      const total = monthExpenses.reduce((s, e) => s + e.amount, 0);
      if (total > context.monthlyBudget) {
        toast.warning(
          `Budget exceeded! ${formatAmount(total, sym)} / ${formatAmount(context.monthlyBudget, sym)}`,
        );
      } else if (total > context.monthlyBudget * 0.9) {
        toast.warning(
          `90% of budget used: ${formatAmount(total, sym)} / ${formatAmount(context.monthlyBudget, sym)}`,
        );
      }
    }
  };

  const selectCategory = (catName) => {
    if (pendingExpense) {
      addExpense({ ...pendingExpense, category: catName });
    }
  };

  return (
    <div className={`relative ${flash ? "animate-flash-green" : ""}`}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className={`flex-1 relative ${shake ? "animate-shake" : ""}`}>
          <input
            id="quick-add-input"
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`"500 chai", "200 auto yesterday", "500 food, 200 auto"`}
            className="w-full px-4 py-3.5 rounded-xl bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm border border-gray-200/60 dark:border-dark-border text-navy dark:text-dark-text placeholder-gray-400 dark:placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-coral/40 focus:border-coral text-sm md:text-base shadow-sm transition-shadow focus:shadow-md"
            autoComplete="off"
            aria-label="Quick add expense"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-3.5 bg-gradient-to-r from-coral to-[#f7a072] hover:from-coral-light hover:to-[#f9b088] text-white rounded-xl font-semibold text-sm transition-all active:scale-95 min-w-[44px] shadow-md shadow-coral/20"
          aria-label="Add expense"
        >
          Add
        </button>
      </form>

      {showCategoryPicker && categories && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-dark-card/95 backdrop-blur-lg border border-gray-200/60 dark:border-dark-border rounded-xl shadow-xl p-3 z-30 animate-scale-in">
          <p className="text-xs text-gray-500 dark:text-dark-muted mb-2 font-medium">
            Select a category:
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => selectCategory(cat.name)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-gray-200/60 dark:border-dark-border hover:bg-coral/5 hover:border-coral/30 dark:hover:bg-dark-border transition-all"
              >
                <span>{cat.icon}</span>
                <span className="text-navy dark:text-dark-text font-medium">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setShowCategoryPicker(false);
              setPendingExpense(null);
            }}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
