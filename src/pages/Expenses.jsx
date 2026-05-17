import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "../components/Toast";
import { db } from "../db";
import { useDebounce } from "../hooks";
import { getCurrencySymbol, useStore } from "../store";
import { formatAmount } from "../utils";

const VIRTUAL_THRESHOLD = 200; // Use virtual scroll above this count

export default function Expenses() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Add form state
  const [addAmount, setAddAmount] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addNote, setAddNote] = useState("");
  const [addDate, setAddDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [addRecurring, setAddRecurring] = useState(false);

  const categories = useLiveQuery(() => db.categories.toArray(), []);

  const allExpenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses.where("contextId").equals(activeContextId).toArray()
        : [],
    [activeContextId],
  );

  const debouncedSearch = useDebounce(search, 300);

  const filtered = useMemo(() => {
    if (!allExpenses) return [];
    let result = [...allExpenses];

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.note?.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q),
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((e) => selectedCategories.includes(e.category));
    }

    if (dateFrom) {
      result = result.filter((e) => e.date >= dateFrom);
    }
    if (dateTo) {
      result = result.filter((e) => e.date <= dateTo);
    }

    result.sort((a, b) => {
      if (sortBy === "amount") return b.amount - a.amount;
      return b.date.localeCompare(a.date) || b.id - a.id;
    });

    return result;
  }, [
    allExpenses,
    debouncedSearch,
    selectedCategories,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const hasActiveFilters =
    search || selectedCategories.length > 0 || dateFrom || dateTo;

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    await db.expenses.bulkDelete([...selectedIds]);
    toast.success(`${selectedIds.size} expenses deleted`);
    setSelectedIds(new Set());
  };

  const deleteSingle = async (id) => {
    await db.expenses.delete(id);
    setConfirmDeleteId(null);
    toast.success("Expense deleted");
  };

  const handleEdit = async () => {
    if (!editingExpense) return;
    await db.expenses.update(editingExpense.id, {
      amount: editingExpense.amount,
      category: editingExpense.category,
      note: editingExpense.note,
      date: editingExpense.date,
      isRecurring: editingExpense.isRecurring,
    });
    setEditingExpense(null);
    toast.success("Expense updated");
  };

  const handleDeleteFromEdit = async () => {
    if (!editingExpense) return;
    await db.expenses.delete(editingExpense.id);
    setEditingExpense(null);
    toast.success("Expense deleted");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addAmount || !addCategory || !activeContextId) return;
    await db.expenses.add({
      contextId: activeContextId,
      amount: Number(addAmount),
      category: addCategory,
      note: addNote,
      date: addDate,
      isRecurring: addRecurring,
      createdAt: new Date(),
    });
    setAddAmount("");
    setAddCategory("");
    setAddNote("");
    setAddDate(new Date().toISOString().split("T")[0]);
    setAddRecurring(false);
    setShowAdd(false);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories([]);
    setDateFrom("");
    setDateTo("");
    setSortBy("date");
  };

  // Group by date for display
  const groupedByDate = useMemo(() => {
    const groups = {};
    filtered.forEach((e) => {
      const key = e.date;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Pagination for large lists
  const [visibleCount, setVisibleCount] = useState(30);
  const isLargeList = filtered.length > VIRTUAL_THRESHOLD;
  const visibleGroups = isLargeList
    ? (() => {
        let count = 0;
        const result = [];
        for (const group of groupedByDate) {
          if (count >= visibleCount) break;
          result.push(group);
          count += group[1].length;
        }
        return result;
      })()
    : groupedByDate;

  const hasMore = isLargeList && visibleGroups.length < groupedByDate.length;
  const loadMore = useCallback(() => setVisibleCount((c) => c + 30), []);

  return (
    <div className="space-y-4">
      {/* Header with count and total */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
            Expenses
          </h1>
          <p className="text-xs text-gray-400 dark:text-dark-muted mt-0.5">
            {filtered.length} entries · Total:{" "}
            <span className="font-semibold font-mono-amount">
              {formatAmount(filteredTotal, sym)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2 rounded-xl border transition-colors ${
              showFilters || hasActiveFilters
                ? "border-coral bg-coral/10 text-coral"
                : "border-gray-200 dark:border-dark-border text-gray-500 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border"
            }`}
            aria-label="Toggle filters"
          >
            🔍
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-coral rounded-full" />
            )}
          </button>
          <button
            onClick={() => {
              setShowAdd(true);
              if (categories?.length > 0 && !addCategory)
                setAddCategory(categories[0].name);
            }}
            className="flex items-center gap-1 px-3 py-2 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-light transition-colors"
          >
            <span>+</span> Add
          </button>
        </div>
      </div>

      {/* Filters - collapsible */}
      {showFilters && (
        <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border space-y-3 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-dark-muted">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-[10px] text-coral hover:text-coral-light"
              >
                Clear all
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Search by note or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-coral/40"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => toggleCategory(cat.name)}
                className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-colors ${
                  selectedCategories.includes(cat.name)
                    ? "border-coral bg-coral/10 text-coral"
                    : "border-gray-200 dark:border-dark-border text-gray-500 dark:text-dark-muted hover:bg-gray-50 dark:hover:bg-dark-border"
                }`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-cream dark:bg-dark text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-cream dark:bg-dark text-xs text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-dark-border bg-cream dark:bg-dark text-xs text-navy dark:text-dark-text ml-auto focus:outline-none focus:ring-2 focus:ring-coral/40"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
            </select>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-coral/10 border border-coral/30 rounded-xl px-4 py-2.5 animate-fade-in-up">
          <span className="text-sm text-coral font-medium">
            {selectedIds.size} selected
          </span>
          <button
            onClick={selectAll}
            className="text-xs text-gray-500 dark:text-dark-muted hover:text-navy dark:hover:text-white"
          >
            {selectedIds.size === filtered.length
              ? "Deselect all"
              : "Select all"}
          </button>
          <button
            onClick={deleteSelected}
            className="ml-auto text-sm text-red-600 font-medium hover:text-red-700"
          >
            🗑️ Delete
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500"
          >
            ✕
          </button>
        </div>
      )}

      {/* Expenses list grouped by date */}
      {visibleGroups.length > 0 ? (
        <div className="space-y-3">
          {isLargeList && (
            <p className="text-xs text-gray-400 dark:text-dark-muted text-center">
              Showing {visibleGroups.reduce((s, g) => s + g[1].length, 0)} of{" "}
              {filtered.length} expenses
            </p>
          )}
          {visibleGroups.map(([dateKey, dateExpenses]) => {
            const dayTotal = dateExpenses.reduce((s, e) => s + e.amount, 0);
            return (
              <div
                key={dateKey}
                className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden"
              >
                {/* Date header */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-dark-border/50 border-b border-gray-100 dark:border-dark-border">
                  <span className="text-xs font-medium text-gray-500 dark:text-dark-muted">
                    {format(
                      new Date(dateKey + "T00:00:00"),
                      "EEEE, dd MMM yyyy",
                    )}
                  </span>
                  <span className="text-xs font-semibold font-mono-amount text-navy dark:text-dark-text">
                    {formatAmount(dayTotal, sym)}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-dark-border">
                  {dateExpenses.map((expense) => {
                    const cat = categories?.find(
                      (c) => c.name === expense.category,
                    );
                    const isConfirmingDelete = confirmDeleteId === expense.id;

                    return (
                      <div
                        key={expense.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-border/50 transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(expense.id)}
                          onChange={() => toggleSelect(expense.id)}
                          className="rounded accent-coral flex-shrink-0"
                        />
                        <span className="text-lg flex-shrink-0">
                          {cat?.icon || "📦"}
                        </span>
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => setEditingExpense({ ...expense })}
                          role="button"
                          tabIndex={0}
                        >
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
                        <p className="text-sm font-semibold font-mono-amount text-navy dark:text-dark-text flex-shrink-0">
                          {formatAmount(expense.amount, sym)}
                        </p>

                        {/* Action buttons - always visible on mobile, hover on desktop */}
                        {isConfirmingDelete ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => deleteSingle(expense.id)}
                              className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-medium"
                            >
                              Del
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-gray-200 dark:bg-dark-border text-gray-600 rounded-lg text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingExpense({ ...expense })}
                              className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg transition-colors"
                              aria-label="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(expense.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                              aria-label="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {hasMore && (
            <button
              onClick={loadMore}
              className="w-full py-3 text-sm text-coral font-medium hover:text-coral-light transition-colors bg-white dark:bg-dark-card rounded-xl border border-gray-100 dark:border-dark-border"
            >
              Load more expenses...
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border text-center py-12 text-gray-400 dark:text-dark-muted">
          <p className="text-4xl mb-3">{hasActiveFilters ? "🔍" : "✨"}</p>
          <p className="text-sm font-medium mb-1">
            {hasActiveFilters
              ? "No expenses match your filters"
              : "No expenses yet"}
          </p>
          {hasActiveFilters ? (
            <button
              onClick={clearFilters}
              className="mt-2 text-xs text-coral hover:text-coral-light"
            >
              Clear filters
            </button>
          ) : (
            <button
              onClick={() => {
                setShowAdd(true);
                if (categories?.length > 0 && !addCategory)
                  setAddCategory(categories[0].name);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-coral text-white rounded-xl text-sm font-medium hover:bg-coral-light transition-colors"
            >
              + Add your first expense
            </button>
          )}
        </div>
      )}

      {/* Floating Add Button (mobile) */}
      <button
        onClick={() => {
          setShowAdd(true);
          if (categories?.length > 0 && !addCategory)
            setAddCategory(categories[0].name);
        }}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-coral hover:bg-coral-light text-white rounded-full shadow-lg shadow-coral/25 flex items-center justify-center text-2xl transition-all active:scale-90 z-40 hover:shadow-xl"
        aria-label="Add expense"
      >
        +
      </button>

      {/* Add Modal - bottom sheet on mobile */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-md border-t md:border border-gray-200 dark:border-dark-border animate-fade-in-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white">
                Add Expense
              </h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
                data-modal-close
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={addNote}
                    onChange={(e) => setAddNote(e.target.value)}
                    placeholder="Optional"
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
              </div>

              <label className="flex items-center gap-2 text-sm text-navy dark:text-dark-text">
                <input
                  type="checkbox"
                  checked={addRecurring}
                  onChange={(e) => setAddRecurring(e.target.checked)}
                  className="accent-coral"
                />
                Recurring expense
              </label>

              <button
                type="submit"
                disabled={!addAmount || !addCategory}
                className="w-full py-3 bg-coral hover:bg-coral-light disabled:opacity-40 text-white rounded-xl font-medium transition-colors text-sm mt-2"
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

      {/* Edit Modal - bottom sheet on mobile */}
      {editingExpense && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
          onClick={() => setEditingExpense(null)}
        >
          <div
            className="bg-white dark:bg-dark-card rounded-t-2xl md:rounded-2xl p-5 w-full md:max-w-md border-t md:border border-gray-200 dark:border-dark-border animate-fade-in-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white">
                Edit Expense
              </h3>
              <button
                onClick={() => setEditingExpense(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
                data-modal-close
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
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
                    value={editingExpense.amount}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        amount: Number(e.target.value),
                      })
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-2xl font-heading font-bold text-navy dark:text-dark-text font-mono-amount focus:outline-none focus:ring-2 focus:ring-coral/40"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 dark:text-dark-muted mb-2">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {categories?.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setEditingExpense({
                          ...editingExpense,
                          category: c.name,
                        })
                      }
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-xl text-center transition-all ${
                        editingExpense.category === c.name
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

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={editingExpense.note || ""}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        note: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-dark-muted mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) =>
                      setEditingExpense({
                        ...editingExpense,
                        date: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-navy dark:text-dark-text">
                <input
                  type="checkbox"
                  checked={editingExpense.isRecurring}
                  onChange={(e) =>
                    setEditingExpense({
                      ...editingExpense,
                      isRecurring: e.target.checked,
                    })
                  }
                  className="accent-coral"
                />
                Recurring expense
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDeleteFromEdit}
                  className="px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  🗑️ Delete
                </button>
                <button
                  onClick={handleEdit}
                  className="flex-1 py-2.5 bg-coral hover:bg-coral-light text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
