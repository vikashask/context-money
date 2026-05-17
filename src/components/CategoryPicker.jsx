import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../db";

export default function CategoryPicker({
  value,
  onChange,
  showBudget = false,
}) {
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const [search, setSearch] = useState("");

  if (!categories) return null;

  const filtered = search
    ? categories.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.keywords?.some((k) =>
            k.toLowerCase().includes(search.toLowerCase()),
          ),
      )
    : categories;

  return (
    <div className="space-y-2">
      {categories.length > 8 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
        />
      )}
      <div className="flex flex-wrap gap-2">
        {filtered.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.name)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all min-h-[44px] ${
              value === cat.name
                ? "border-coral bg-coral/10 text-coral font-medium"
                : "border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border text-navy dark:text-dark-text"
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
            {showBudget && cat.budgetLimit > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                (₹{cat.budgetLimit?.toLocaleString()})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
