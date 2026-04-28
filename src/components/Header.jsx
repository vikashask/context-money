import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useStore, getCurrencySymbol } from '../store';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Header() {
  const { activeContextId, setActiveContextId, darkMode, toggleDarkMode } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const contexts = useLiveQuery(() => db.contexts.where('isArchived').equals(0).toArray(), []);
  const activeContext = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId]
  );

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-card/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 group" aria-label="Go to dashboard">
          <span className="text-xl font-heading font-bold text-navy dark:text-white">
            Context<span className="text-coral">Money</span>
          </span>
        </button>

        <div className="flex items-center gap-3">
          {contexts && contexts.length > 0 && (
            <select
              value={activeContextId || ''}
              onChange={(e) => setActiveContextId(Number(e.target.value))}
              className="text-sm bg-cream dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg px-2 py-1.5 text-navy dark:text-dark-text font-medium focus:outline-none focus:ring-2 focus:ring-coral/40 max-w-[140px] truncate"
              aria-label="Select context"
            >
              {contexts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-border transition-colors"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
