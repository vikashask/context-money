import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';

const mainTabs = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/expenses', label: 'Expenses', icon: '💳' },
  { path: '/analytics', label: 'Analytics', icon: '📈' },
];

const moreTabs = [
  { path: '/compare', label: 'Compare', icon: '🔄' },
  { path: '/simulator', label: 'Simulator', icon: '🎯' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path) => location.pathname === path;
  const isMoreActive = moreTabs.some((t) => isActive(t.path));

  return (
    <>
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-200 dark:border-dark-border p-2 min-w-[200px]"
            onClick={(e) => e.stopPropagation()}>
            {moreTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => { navigate(tab.path); setShowMore(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(tab.path) ? 'bg-coral/10 text-coral' : 'text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/90 dark:bg-dark-card/90 backdrop-blur-md border-t border-gray-200 dark:border-dark-border" role="navigation" aria-label="Main navigation">
        <div className="flex items-center justify-around py-2 px-2">
          {mainTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[64px] transition-colors ${
                isActive(tab.path) ? 'text-coral' : 'text-gray-500 dark:text-dark-muted'
              }`}
              aria-label={tab.label}
              aria-current={isActive(tab.path) ? 'page' : undefined}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[64px] transition-colors ${
              isMoreActive ? 'text-coral' : 'text-gray-500 dark:text-dark-muted'
            }`}
            aria-label="More options"
          >
            <span className="text-xl">•••</span>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
