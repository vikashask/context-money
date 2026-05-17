import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { useToast } from "../components/Toast";
import { db } from "../db";
import { CURRENCIES, getCurrencySymbol, useStore } from "../store";
import {
  clearAllData,
  exportAllData,
  formatBytes,
  getStorageUsage,
  importData,
  validateImportData,
} from "../utils/storage";

function CollapsibleSection({ title, icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left min-h-[52px]"
      >
        <span className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-navy dark:text-white">
            {title}
          </span>
        </span>
        <span
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 dark:border-dark-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function StorageUsageCard() {
  const usage = getStorageUsage();
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
      <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-2">
        Storage Usage
      </h3>
      <div className="flex justify-between text-xs text-gray-400 dark:text-dark-muted mb-1">
        <span>{formatBytes(usage.usedBytes)} used</span>
        <span>{formatBytes(usage.totalBytes)} limit</span>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-dark-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${usage.isNearLimit ? "bg-red-500" : "bg-green-500"}`}
          style={{ width: `${Math.min(usage.percentage, 100)}%` }}
        />
      </div>
      {usage.isNearLimit && (
        <p className="text-xs text-red-500 mt-1">
          Storage is nearly full. Consider exporting and clearing old data.
        </p>
      )}
    </div>
  );
}

export default function Settings() {
  const {
    currency,
    setCurrency,
    activeContextId,
    setActiveContextId,
    darkMode,
    toggleDarkMode,
  } = useStore();
  const sym = getCurrencySymbol(currency);
  const toast = useToast();
  const [editingCat, setEditingCat] = useState(null);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📦");
  const [newCatColor, setNewCatColor] = useState("#6b7280");
  const [newCatKeywords, setNewCatKeywords] = useState("");
  const [newCatBudget, setNewCatBudget] = useState("");
  const [showAddCat, setShowAddCat] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // Context management
  const [showAddContext, setShowAddContext] = useState(false);
  const [ctxName, setCtxName] = useState("");
  const [ctxIncome, setCtxIncome] = useState("");
  const [ctxBudget, setCtxBudget] = useState("");
  const [editingContext, setEditingContext] = useState(null);

  // Sync state
  const [gistToken, setGistToken] = useState(
    () => localStorage.getItem("contextmoney-gist-token") || "",
  );
  const [gistId, setGistId] = useState(
    () => localStorage.getItem("contextmoney-gist-id") || "",
  );
  const [syncing, setSyncing] = useState(false);

  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const contexts = useLiveQuery(() => db.contexts.toArray(), []);

  // Category management
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await db.categories.add({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      keywords: newCatKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      budgetLimit: Number(newCatBudget) || 0,
    });
    setNewCatName("");
    setNewCatIcon("📦");
    setNewCatColor("#6b7280");
    setNewCatKeywords("");
    setNewCatBudget("");
    setShowAddCat(false);
  };

  const updateCategory = async () => {
    if (!editingCat) return;
    await db.categories.update(editingCat.id, {
      name: editingCat.name,
      icon: editingCat.icon,
      color: editingCat.color,
      keywords: editingCat.keywords,
    });
    setEditingCat(null);
  };

  const deleteCategory = async (id) => {
    await db.categories.delete(id);
  };

  // Context management
  const addContext = async () => {
    if (!ctxName.trim()) return;
    const id = await db.contexts.add({
      name: ctxName.trim(),
      currency,
      monthlyIncome: Number(ctxIncome) || 0,
      monthlyBudget: Number(ctxBudget) || 0,
      createdAt: new Date(),
      isArchived: 0,
    });
    if (!activeContextId) setActiveContextId(id);
    setCtxName("");
    setCtxIncome("");
    setCtxBudget("");
    setShowAddContext(false);
  };

  const updateContext = async () => {
    if (!editingContext) return;
    await db.contexts.update(editingContext.id, {
      name: editingContext.name,
      monthlyIncome: editingContext.monthlyIncome,
      monthlyBudget: editingContext.monthlyBudget,
      isArchived: editingContext.isArchived,
    });
    setEditingContext(null);
  };

  // Export
  const exportJSON = async () => {
    try {
      const data = await exportAllData(db);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contextmoney-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully");
    } catch {
      toast.error("Failed to export data");
    }
  };

  const exportCSV = async () => {
    const expenses = await db.expenses.toArray();
    const headers =
      "ID,Context ID,Amount,Category,Note,Date,Is Recurring,Created At\n";
    const rows = expenses
      .map(
        (e) =>
          `${e.id},${e.contextId},${e.amount},"${e.category}","${(e.note || "").replace(/"/g, '""')}",${e.date},${e.isRecurring},${e.createdAt}`,
      )
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contextmoney-expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImportSuccess("");
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateImportData(data);
      if (!validation.valid) {
        setImportError(validation.error);
        toast.error(validation.error);
        return;
      }
      if (!confirm("This will replace all existing data. Continue?")) return;
      const result = await importData(db, data, setActiveContextId);
      setImportSuccess(
        `Imported ${result.contextsCount} contexts and ${result.expensesCount} expenses`,
      );
      toast.success("Data imported successfully");
    } catch (err) {
      setImportError(err.message || "Failed to parse the import file.");
      toast.error("Import failed: " + (err.message || "Invalid file"));
    }
    e.target.value = "";
  };

  // Reset
  const handleReset = async () => {
    if (resetConfirm !== "DELETE") return;
    await clearAllData(db);
    window.location.reload();
  };

  // Sync: Export shareable JSON
  const handleSyncExport = async () => {
    try {
      const data = await exportSyncData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contextmoney-sync-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Sync file exported");
    } catch {
      toast.error("Failed to export sync data");
    }
  };

  // Sync: Import and merge
  const handleSyncImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const stats = await importSyncData(text);
      toast.success(
        `Merged: ${stats.expensesAdded} new expenses, ${stats.contextsAdded} contexts`,
      );
    } catch (err) {
      toast.error("Sync import failed: " + (err.message || "Invalid file"));
    }
    e.target.value = "";
  };

  // Gist sync
  const handleGistPush = async () => {
    if (!gistToken) {
      toast.error("Enter your GitHub PAT first");
      return;
    }
    setSyncing(true);
    try {
      const result = await saveToGist(gistToken, gistId || null);
      setGistId(result.gistId);
      localStorage.setItem("contextmoney-gist-token", gistToken);
      localStorage.setItem("contextmoney-gist-id", result.gistId);
      toast.success("Pushed to Gist successfully");
    } catch (err) {
      toast.error("Gist push failed: " + err.message);
    }
    setSyncing(false);
  };

  const handleGistPull = async () => {
    if (!gistToken || !gistId) {
      toast.error("Enter your GitHub PAT and Gist ID first");
      return;
    }
    setSyncing(true);
    try {
      const stats = await loadFromGist(gistToken, gistId);
      toast.success(
        `Pulled: ${stats.expensesAdded} new expenses, ${stats.contextsAdded} contexts`,
      );
    } catch (err) {
      toast.error("Gist pull failed: " + err.message);
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-heading font-bold text-navy dark:text-white">
        Settings
      </h1>

      {/* Appearance */}
      <CollapsibleSection title="Appearance" icon="🎨" defaultOpen>
        <div className="flex items-center justify-between">
          <span className="text-sm text-navy dark:text-dark-text">
            Dark Mode
          </span>
          <button
            onClick={toggleDarkMode}
            className={`w-12 h-7 rounded-full transition-colors relative ${darkMode ? "bg-coral" : "bg-gray-300"}`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${darkMode ? "translate-x-5.5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        <div>
          <label className="text-sm text-navy dark:text-dark-text block mb-1">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
          >
            {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
              <option key={code} value={code}>
                {symbol} {code} — {name}
              </option>
            ))}
          </select>
        </div>
      </CollapsibleSection>

      {/* Context Management */}
      <CollapsibleSection title="Contexts" icon="📋" defaultOpen>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">
            Contexts
          </h3>
          <button
            onClick={() => setShowAddContext(true)}
            className="text-sm text-coral font-medium"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {contexts?.map((ctx) => (
            <div
              key={ctx.id}
              className="flex items-center justify-between p-3 bg-cream dark:bg-dark rounded-xl"
            >
              <div>
                <p className="text-sm font-medium text-navy dark:text-dark-text">
                  {ctx.name}
                  {ctx.isArchived ? (
                    <span className="ml-2 text-xs text-gray-400">
                      (archived)
                    </span>
                  ) : null}
                  {ctx.id === activeContextId && (
                    <span className="ml-2 text-xs text-coral">Active</span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  Income: {sym}
                  {ctx.monthlyIncome?.toLocaleString()} | Budget: {sym}
                  {ctx.monthlyBudget?.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveContextId(ctx.id)}
                  className="text-xs text-blue-500 hover:underline"
                  disabled={ctx.id === activeContextId}
                >
                  {ctx.id === activeContextId ? "" : "Activate"}
                </button>
                <button
                  onClick={() => setEditingContext({ ...ctx })}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Context Modal */}
        {showAddContext && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowAddContext(false)}
          >
            <div
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">
                New Context
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={ctxName}
                  onChange={(e) => setCtxName(e.target.value)}
                  placeholder="Context name"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <input
                  type="number"
                  value={ctxIncome}
                  onChange={(e) => setCtxIncome(e.target.value)}
                  placeholder="Monthly income"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <input
                  type="number"
                  value={ctxBudget}
                  onChange={(e) => setCtxBudget(e.target.value)}
                  placeholder="Monthly budget"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddContext(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm"
                    data-modal-close
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addContext}
                    className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Context Modal */}
        {editingContext && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setEditingContext(null)}
          >
            <div
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">
                Edit Context
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingContext.name}
                  onChange={(e) =>
                    setEditingContext({
                      ...editingContext,
                      name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <input
                  type="number"
                  value={editingContext.monthlyIncome}
                  onChange={(e) =>
                    setEditingContext({
                      ...editingContext,
                      monthlyIncome: Number(e.target.value),
                    })
                  }
                  placeholder="Monthly income"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <input
                  type="number"
                  value={editingContext.monthlyBudget}
                  onChange={(e) =>
                    setEditingContext({
                      ...editingContext,
                      monthlyBudget: Number(e.target.value),
                    })
                  }
                  placeholder="Monthly budget"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <label className="flex items-center gap-2 text-sm text-navy dark:text-dark-text">
                  <input
                    type="checkbox"
                    checked={!!editingContext.isArchived}
                    onChange={(e) =>
                      setEditingContext({
                        ...editingContext,
                        isArchived: e.target.checked ? 1 : 0,
                      })
                    }
                    className="accent-coral"
                  />
                  Archived
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingContext(null)}
                    className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm"
                    data-modal-close
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateContext}
                    className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Categories Management */}
      <CollapsibleSection title="Categories" icon="🏷️">
        <button
          onClick={() => setShowAddCat(true)}
          className="text-sm text-coral font-medium self-end"
        >
          + Add Category
        </button>
        <div className="space-y-2">
          {categories?.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between p-2.5 bg-cream dark:bg-dark rounded-xl"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium text-navy dark:text-dark-text">
                    {cat.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-dark-muted truncate max-w-[200px]">
                    {cat.keywords?.join(", ") || "No keywords"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCat({ ...cat })}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-xs text-red-400 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Category Modal */}
        {showAddCat && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setShowAddCat(false)}
          >
            <div
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">
                Add Category
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    placeholder="Emoji"
                    className="w-20 px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text text-center focus:outline-none focus:ring-2 focus:ring-coral/40"
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={newCatKeywords}
                  onChange={(e) => setNewCatKeywords(e.target.value)}
                  placeholder="Keywords (comma-separated)"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAddCat(false)}
                    className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm"
                    data-modal-close
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCategory}
                    className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCat && (
          <div
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
            onClick={() => setEditingCat(null)}
          >
            <div
              className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">
                Edit Category
              </h3>
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingCat.name}
                  onChange={(e) =>
                    setEditingCat({ ...editingCat, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={editingCat.icon}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, icon: e.target.value })
                    }
                    className="w-20 px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text text-center focus:outline-none focus:ring-2 focus:ring-coral/40"
                  />
                  <input
                    type="color"
                    value={editingCat.color}
                    onChange={(e) =>
                      setEditingCat({ ...editingCat, color: e.target.value })
                    }
                    className="w-12 h-10 rounded-lg cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={editingCat.keywords?.join(", ") || ""}
                  onChange={(e) =>
                    setEditingCat({
                      ...editingCat,
                      keywords: e.target.value
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Keywords (comma-separated)"
                  className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingCat(null)}
                    className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm"
                    data-modal-close
                  >
                    Cancel
                  </button>
                  <button
                    onClick={updateCategory}
                    className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Data & Sync */}
      <CollapsibleSection title="Data & Sync" icon="📦">
        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="flex-1 py-2 px-3 bg-navy dark:bg-dark-border text-white rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]"
          >
            Export JSON
          </button>
          <button
            onClick={exportCSV}
            className="flex-1 py-2 px-3 bg-navy dark:bg-dark-border text-white rounded-xl text-sm font-medium hover:opacity-90 min-h-[44px]"
          >
            Export CSV
          </button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 dark:text-dark-muted mb-1">
            Import JSON backup (replaces all data)
          </label>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:bg-cream dark:file:bg-dark-border file:text-navy dark:file:text-dark-text file:cursor-pointer"
          />
          {importError && (
            <p className="text-xs text-red-500 mt-1">{importError}</p>
          )}
          {importSuccess && (
            <p className="text-xs text-green-600 mt-1">{importSuccess}</p>
          )}
        </div>

        {/* Merge Sync */}
        <div className="border-t border-gray-100 dark:border-dark-border pt-3 mt-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-2">
            Multi-Device Sync (merge, no data loss)
          </h4>
          <div className="flex gap-2">
            <button
              onClick={handleSyncExport}
              className="flex-1 py-2 px-3 border border-coral text-coral rounded-xl text-sm font-medium hover:bg-coral/10 min-h-[44px]"
            >
              Export Sync File
            </button>
            <label className="flex-1 py-2 px-3 border border-coral text-coral rounded-xl text-sm font-medium hover:bg-coral/10 min-h-[44px] flex items-center justify-center cursor-pointer">
              Import & Merge
              <input
                type="file"
                accept=".json"
                onChange={handleSyncImport}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* GitHub Gist Sync */}
        <div className="border-t border-gray-100 dark:border-dark-border pt-3 mt-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-dark-muted mb-2">
            GitHub Gist Sync
          </h4>
          <div className="space-y-2">
            <input
              type="password"
              value={gistToken}
              onChange={(e) => setGistToken(e.target.value)}
              placeholder="GitHub Personal Access Token"
              className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
            />
            <input
              type="text"
              value={gistId}
              onChange={(e) => setGistId(e.target.value)}
              placeholder="Gist ID (leave empty to create new)"
              className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40"
            />
            <div className="flex gap-2">
              <button
                onClick={handleGistPush}
                disabled={syncing || !gistToken}
                className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium disabled:opacity-40 min-h-[44px]"
              >
                {syncing ? "Syncing..." : "Push ↑"}
              </button>
              <button
                onClick={handleGistPull}
                disabled={syncing || !gistToken || !gistId}
                className="flex-1 py-2 bg-navy dark:bg-dark-border text-white rounded-xl text-sm font-medium disabled:opacity-40 min-h-[44px]"
              >
                {syncing ? "Syncing..." : "Pull ↓"}
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Storage Usage */}
      <StorageUsageCard />

      {/* Danger Zone */}
      <CollapsibleSection title="Danger Zone" icon="⚠️">
        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            className="py-2 px-4 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600"
          >
            Reset All Data
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-600 dark:text-red-400">
              Type "DELETE" to confirm. This cannot be undone.
            </p>
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-dark text-navy dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowReset(false);
                  setResetConfirm("");
                }}
                className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetConfirm !== "DELETE"}
                className="flex-1 py-2 bg-red-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* About */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
        <p className="text-lg font-heading font-bold text-navy dark:text-white mb-1">
          Context<span className="text-coral">Money</span>{" "}
          <span className="text-xs text-gray-400">v2.0</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-muted mb-2">
          Your data never leaves this device. No servers. No tracking. No
          accounts. Built with privacy in mind.
        </p>
        <div className="text-xs text-gray-400 dark:text-dark-muted space-y-0.5">
          <p>React + Vite + Tailwind CSS + Dexie (IndexedDB)</p>
          <p>Offline-first PWA with multi-device sync</p>
        </div>
      </div>
    </div>
  );
}
