import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol, CURRENCIES } from '../store';

export default function Settings() {
  const { currency, setCurrency, activeContextId, setActiveContextId } = useStore();
  const sym = getCurrencySymbol(currency);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatColor, setNewCatColor] = useState('#6b7280');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [showAddCat, setShowAddCat] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  // Context management
  const [showAddContext, setShowAddContext] = useState(false);
  const [ctxName, setCtxName] = useState('');
  const [ctxIncome, setCtxIncome] = useState('');
  const [ctxBudget, setCtxBudget] = useState('');
  const [editingContext, setEditingContext] = useState(null);

  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const contexts = useLiveQuery(() => db.contexts.toArray(), []);

  // Category management
  const addCategory = async () => {
    if (!newCatName.trim()) return;
    await db.categories.add({
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      keywords: newCatKeywords.split(',').map((k) => k.trim()).filter(Boolean),
    });
    setNewCatName('');
    setNewCatIcon('📦');
    setNewCatColor('#6b7280');
    setNewCatKeywords('');
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
    setCtxName('');
    setCtxIncome('');
    setCtxBudget('');
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
    const data = {
      contexts: await db.contexts.toArray(),
      expenses: await db.expenses.toArray(),
      categories: await db.categories.toArray(),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextmoney-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = async () => {
    const expenses = await db.expenses.toArray();
    const headers = 'ID,Context ID,Amount,Category,Note,Date,Is Recurring,Created At\n';
    const rows = expenses.map((e) =>
      `${e.id},${e.contextId},${e.amount},"${e.category}","${(e.note || '').replace(/"/g, '""')}",${e.date},${e.isRecurring},${e.createdAt}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contextmoney-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    setImportSuccess('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.contexts || !data.expenses || !data.categories || data.version !== '1.0') {
        setImportError('Invalid backup file format.');
        return;
      }
      if (!confirm('This will replace all existing data. Continue?')) return;
      await db.contexts.clear();
      await db.expenses.clear();
      await db.categories.clear();
      await db.contexts.bulkAdd(data.contexts);
      await db.expenses.bulkAdd(data.expenses);
      await db.categories.bulkAdd(data.categories);
      if (data.contexts.length > 0) {
        setActiveContextId(data.contexts[0].id);
      }
      setImportSuccess('Data imported successfully!');
    } catch {
      setImportError('Failed to parse the import file.');
    }
    e.target.value = '';
  };

  // Reset
  const handleReset = async () => {
    if (resetConfirm !== 'DELETE') return;
    await db.contexts.clear();
    await db.expenses.clear();
    await db.categories.clear();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-heading font-bold text-navy dark:text-white">Settings</h1>

      {/* Context Management */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">Contexts</h3>
          <button onClick={() => setShowAddContext(true)} className="text-sm text-coral font-medium">+ Add</button>
        </div>
        <div className="space-y-2">
          {contexts?.map((ctx) => (
            <div key={ctx.id} className="flex items-center justify-between p-3 bg-cream dark:bg-dark rounded-xl">
              <div>
                <p className="text-sm font-medium text-navy dark:text-dark-text">
                  {ctx.name}
                  {ctx.isArchived ? <span className="ml-2 text-xs text-gray-400">(archived)</span> : null}
                  {ctx.id === activeContextId && <span className="ml-2 text-xs text-coral">Active</span>}
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-muted">
                  Income: {sym}{ctx.monthlyIncome?.toLocaleString()} | Budget: {sym}{ctx.monthlyBudget?.toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveContextId(ctx.id)} className="text-xs text-blue-500 hover:underline" disabled={ctx.id === activeContextId}>
                  {ctx.id === activeContextId ? '' : 'Activate'}
                </button>
                <button onClick={() => setEditingContext({ ...ctx })} className="text-xs text-gray-500 hover:underline">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Context Modal */}
      {showAddContext && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddContext(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">New Context</h3>
            <div className="space-y-3">
              <input type="text" value={ctxName} onChange={(e) => setCtxName(e.target.value)} placeholder="Context name" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <input type="number" value={ctxIncome} onChange={(e) => setCtxIncome(e.target.value)} placeholder="Monthly income" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <input type="number" value={ctxBudget} onChange={(e) => setCtxBudget(e.target.value)} placeholder="Monthly budget" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddContext(false)} className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm" data-modal-close>Cancel</button>
                <button onClick={addContext} className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium">Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Context Modal */}
      {editingContext && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingContext(null)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">Edit Context</h3>
            <div className="space-y-3">
              <input type="text" value={editingContext.name} onChange={(e) => setEditingContext({ ...editingContext, name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <input type="number" value={editingContext.monthlyIncome} onChange={(e) => setEditingContext({ ...editingContext, monthlyIncome: Number(e.target.value) })} placeholder="Monthly income" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <input type="number" value={editingContext.monthlyBudget} onChange={(e) => setEditingContext({ ...editingContext, monthlyBudget: Number(e.target.value) })} placeholder="Monthly budget" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <label className="flex items-center gap-2 text-sm text-navy dark:text-dark-text">
                <input type="checkbox" checked={!!editingContext.isArchived} onChange={(e) => setEditingContext({ ...editingContext, isArchived: e.target.checked ? 1 : 0 })} className="accent-coral" />
                Archived
              </label>
              <div className="flex gap-2">
                <button onClick={() => setEditingContext(null)} className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm" data-modal-close>Cancel</button>
                <button onClick={updateContext} className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Currency */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted mb-2">Currency</h3>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-sm text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40">
          {Object.entries(CURRENCIES).map(([code, { name, symbol }]) => (
            <option key={code} value={code}>{symbol} {code} — {name}</option>
          ))}
        </select>
      </div>

      {/* Categories Management */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">Categories</h3>
          <button onClick={() => setShowAddCat(true)} className="text-sm text-coral font-medium">+ Add</button>
        </div>
        <div className="space-y-2">
          {categories?.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-cream dark:bg-dark rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.icon}</span>
                <div>
                  <p className="text-sm font-medium text-navy dark:text-dark-text">{cat.name}</p>
                  <p className="text-xs text-gray-400 dark:text-dark-muted truncate max-w-[200px]">{cat.keywords?.join(', ') || 'No keywords'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingCat({ ...cat })} className="text-xs text-gray-500 hover:underline">Edit</button>
                <button onClick={() => deleteCategory(cat.id)} className="text-xs text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCat && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowAddCat(false)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">Add Category</h3>
            <div className="space-y-3">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Category name" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <div className="flex gap-3">
                <input type="text" value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)} placeholder="Emoji" className="w-20 px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text text-center focus:outline-none focus:ring-2 focus:ring-coral/40" />
                <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer" />
              </div>
              <input type="text" value={newCatKeywords} onChange={(e) => setNewCatKeywords(e.target.value)} placeholder="Keywords (comma-separated)" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddCat(false)} className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm" data-modal-close>Cancel</button>
                <button onClick={addCategory} className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium">Add</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCat && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingCat(null)}>
          <div className="bg-white dark:bg-dark-card rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-heading font-bold text-navy dark:text-white mb-4">Edit Category</h3>
            <div className="space-y-3">
              <input type="text" value={editingCat.name} onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <div className="flex gap-3">
                <input type="text" value={editingCat.icon} onChange={(e) => setEditingCat({ ...editingCat, icon: e.target.value })} className="w-20 px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text text-center focus:outline-none focus:ring-2 focus:ring-coral/40" />
                <input type="color" value={editingCat.color} onChange={(e) => setEditingCat({ ...editingCat, color: e.target.value })} className="w-12 h-10 rounded-lg cursor-pointer" />
              </div>
              <input type="text" value={editingCat.keywords?.join(', ') || ''} onChange={(e) => setEditingCat({ ...editingCat, keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean) })} placeholder="Keywords (comma-separated)" className="w-full px-3 py-2 rounded-xl bg-cream dark:bg-dark border border-gray-200 dark:border-dark-border text-navy dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-coral/40" />
              <div className="flex gap-2">
                <button onClick={() => setEditingCat(null)} className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm" data-modal-close>Cancel</button>
                <button onClick={updateCategory} className="flex-1 py-2 bg-coral text-white rounded-xl text-sm font-medium">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export/Import */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border space-y-3">
        <h3 className="text-sm font-medium text-gray-500 dark:text-dark-muted">Data</h3>
        <div className="flex gap-2">
          <button onClick={exportJSON} className="flex-1 py-2 px-3 bg-navy dark:bg-dark-border text-white rounded-xl text-sm font-medium hover:opacity-90">Export JSON</button>
          <button onClick={exportCSV} className="flex-1 py-2 px-3 bg-navy dark:bg-dark-border text-white rounded-xl text-sm font-medium hover:opacity-90">Export CSV</button>
        </div>
        <div>
          <label className="block text-xs text-gray-400 dark:text-dark-muted mb-1">Import JSON backup</label>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-sm file:bg-cream dark:file:bg-dark-border file:text-navy dark:file:text-dark-text file:cursor-pointer"
          />
          {importError && <p className="text-xs text-red-500 mt-1">{importError}</p>}
          {importSuccess && <p className="text-xs text-green-600 mt-1">{importSuccess}</p>}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl p-4 border border-red-200 dark:border-red-900">
        <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} className="py-2 px-4 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600">
            Reset All Data
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-red-600 dark:text-red-400">Type "DELETE" to confirm. This cannot be undone.</p>
            <input
              type="text"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder='Type "DELETE"'
              className="w-full px-3 py-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-dark text-navy dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowReset(false); setResetConfirm(''); }} className="flex-1 py-2 border border-gray-200 dark:border-dark-border rounded-xl text-sm">Cancel</button>
              <button onClick={handleReset} disabled={resetConfirm !== 'DELETE'} className="flex-1 py-2 bg-red-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium">Confirm Reset</button>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 border border-gray-100 dark:border-dark-border text-center">
        <p className="text-lg font-heading font-bold text-navy dark:text-white mb-1">
          Context<span className="text-coral">Money</span> <span className="text-xs text-gray-400">v1.0</span>
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-muted">
          Your data never leaves this device. No servers. No tracking. No accounts. Built with privacy in mind.
        </p>
      </div>
    </div>
  );
}
