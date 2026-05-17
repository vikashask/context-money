import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useToast } from "../components/Toast";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";
import { formatAmount } from "../utils";

export default function Recurring() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const toast = useToast();
  const [showDetected, setShowDetected] = useState(false);

  const recurring = useLiveQuery(
    () =>
      activeContextId
        ? db.recurringExpenses
            .where("contextId")
            .equals(activeContextId)
            .toArray()
        : [],
    [activeContextId],
  );

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  // Detect recurring patterns from expense history
  const expenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses
            .where("contextId")
            .equals(activeContextId)
            .reverse()
            .sortBy("date")
        : [],
    [activeContextId],
  );

  const detectedPatterns = detectRecurring(expenses || []);

  const addRecurring = async (pattern) => {
    await db.recurringExpenses.add({
      contextId: activeContextId,
      category: pattern.category,
      amount: pattern.avgAmount,
      note: pattern.note || "",
      frequency: "monthly",
      nextDueDate: getNextDueDate(),
      isActive: true,
      createdAt: new Date(),
    });
    toast.success(`Recurring expense added: ${pattern.category}`);
  };

  const toggleActive = async (id, isActive) => {
    await db.recurringExpenses.update(id, { isActive: !isActive });
  };

  const deleteRecurring = async (id) => {
    await db.recurringExpenses.delete(id);
    toast.success("Recurring expense removed");
  };

  const applyDue = async (rec) => {
    await db.expenses.add({
      contextId: activeContextId,
      amount: rec.amount,
      category: rec.category,
      note: rec.note || `Recurring: ${rec.category}`,
      date: format(new Date(), "yyyy-MM-dd"),
      isRecurring: true,
      tags: ["recurring"],
      createdAt: new Date(),
    });
    await db.recurringExpenses.update(rec.id, {
      nextDueDate: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
    });
    toast.success(`${formatAmount(rec.amount, sym)} added for ${rec.category}`);
  };

  const totalFixed = (recurring || [])
    .filter((r) => r.isActive)
    .reduce((s, r) => s + r.amount, 0);

  const catMap = new Map((categories || []).map((c) => [c.name, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
          Recurring Expenses
        </h1>
        <button
          onClick={() => setShowDetected(!showDetected)}
          className="text-sm text-coral font-medium"
        >
          {showDetected ? "Hide" : "Detect"} Patterns
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <p className="text-sm text-gray-500 dark:text-dark-muted">
          Monthly fixed expenses
        </p>
        <p className="text-2xl font-heading font-bold text-navy dark:text-white">
          {formatAmount(totalFixed, sym)}
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-muted mt-1">
          {(recurring || []).filter((r) => r.isActive).length} active recurring
        </p>
      </div>

      {/* Detected patterns */}
      {showDetected && detectedPatterns.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-3">
            Detected Patterns
          </h3>
          <div className="space-y-2">
            {detectedPatterns.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-white dark:bg-dark-card rounded-xl"
              >
                <div className="flex items-center gap-2">
                  <span>{catMap.get(p.category)?.icon || "📦"}</span>
                  <div>
                    <p className="text-sm font-medium text-navy dark:text-dark-text">
                      {p.category}
                    </p>
                    <p className="text-xs text-gray-400">
                      ~{formatAmount(p.avgAmount, sym)}/mo · {p.occurrences}{" "}
                      times
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => addRecurring(p)}
                  className="text-xs text-coral font-medium px-3 py-1.5 rounded-lg border border-coral/30 hover:bg-coral/10 min-h-[36px]"
                >
                  + Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDetected && detectedPatterns.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-dark-muted text-center py-4">
          No recurring patterns detected yet. Add more expenses to see patterns.
        </p>
      )}

      {/* Active recurring list */}
      <div className="space-y-2">
        {(recurring || []).map((rec) => {
          const cat = catMap.get(rec.category);
          const isDue =
            rec.nextDueDate && new Date(rec.nextDueDate) <= new Date();
          return (
            <div
              key={rec.id}
              className={`bg-white dark:bg-dark-card rounded-2xl p-4 border transition-colors ${
                isDue
                  ? "border-coral/40 bg-coral/5"
                  : "border-gray-100 dark:border-dark-border"
              } ${!rec.isActive ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat?.icon || "📦"}</span>
                  <div>
                    <p className="text-sm font-medium text-navy dark:text-dark-text">
                      {rec.category}
                    </p>
                    <p className="text-lg font-heading font-bold text-navy dark:text-white">
                      {formatAmount(rec.amount, sym)}
                    </p>
                    {rec.note && (
                      <p className="text-xs text-gray-400">{rec.note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Next:{" "}
                      {rec.nextDueDate
                        ? format(parseISO(rec.nextDueDate), "MMM d")
                        : "N/A"}
                      {isDue && (
                        <span className="text-coral font-medium ml-1">
                          Due!
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {isDue && rec.isActive && (
                    <button
                      onClick={() => applyDue(rec)}
                      className="text-xs text-white bg-coral px-3 py-1.5 rounded-lg font-medium min-h-[36px]"
                    >
                      Log
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(rec.id, rec.isActive)}
                    className="text-xs text-gray-500 hover:underline min-h-[36px]"
                  >
                    {rec.isActive ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteRecurring(rec.id)}
                    className="text-xs text-red-400 hover:underline min-h-[36px]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {(!recurring || recurring.length === 0) && !showDetected && (
          <div className="text-center py-8 text-gray-400 dark:text-dark-muted">
            <p className="text-3xl mb-2">🔄</p>
            <p className="text-sm">No recurring expenses set up</p>
            <p className="text-xs mt-1">
              Tap "Detect Patterns" to find them automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getNextDueDate() {
  const now = new Date();
  return format(
    now.getDate() <= 5 ? startOfMonth(now) : startOfMonth(addMonths(now, 1)),
    "yyyy-MM-dd",
  );
}

/**
 * Detect recurring expenses: same category + similar amount appearing 2+ months
 */
function detectRecurring(expenses) {
  if (expenses.length < 5) return [];

  const byCategory = {};
  for (const exp of expenses) {
    if (!byCategory[exp.category]) byCategory[exp.category] = [];
    byCategory[exp.category].push(exp);
  }

  const patterns = [];
  for (const [category, items] of Object.entries(byCategory)) {
    // Group by month
    const monthlyAmounts = {};
    for (const item of items) {
      const month = item.date?.substring(0, 7) || "unknown";
      if (!monthlyAmounts[month]) monthlyAmounts[month] = [];
      monthlyAmounts[month].push(item.amount);
    }

    const months = Object.keys(monthlyAmounts);
    if (months.length < 2) continue;

    // Check if amounts are similar across months (within 30% variance)
    const monthTotals = months.map((m) =>
      monthlyAmounts[m].reduce((s, a) => s + a, 0),
    );
    const avg = monthTotals.reduce((s, a) => s + a, 0) / monthTotals.length;
    const variance =
      monthTotals.reduce((s, a) => s + Math.abs(a - avg), 0) /
      monthTotals.length;

    if (variance / avg < 0.3) {
      patterns.push({
        category,
        avgAmount: Math.round(avg),
        occurrences: months.length,
        note: items[0]?.note || "",
      });
    }
  }

  return patterns.sort((a, b) => b.avgAmount - a.avgAmount);
}
