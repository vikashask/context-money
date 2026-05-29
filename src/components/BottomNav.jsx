import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/analytics", label: "Analytics", icon: "📈" },
  // FAB goes here (index 2)
  { path: "/expenses", label: "Expenses", icon: "💳" },
];

const moreTabs = [
  { path: "/goals", label: "Goals", icon: "🎯" },
  { path: "/recurring", label: "Recurring", icon: "🔁" },
  { path: "/compare", label: "Compare", icon: "🔄" },
  { path: "/simulator", label: "Simulator", icon: "🧮" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleFabClick = () => {
    // Focus the QuickAdd input if on Dashboard, otherwise navigate there
    const input = document.getElementById("quick-add-input");
    if (input) {
      input.focus();
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById("quick-add-input")?.focus();
      }, 300);
    }
  };

  return (
    <>
      {/* More menu popup */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setShowMore(false)}
        >
          <div
            className="absolute bottom-20 right-4 bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-200 dark:border-dark-border p-2 min-w-[180px]"
            onClick={(e) => e.stopPropagation()}
          >
            {moreTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => {
                  navigate(tab.path);
                  setShowMore(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(tab.path)
                    ? "bg-coral/10 text-coral"
                    : "text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-dark-border"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/80 dark:bg-dark-card/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-dark-border/50 safe-area-bottom shadow-lg shadow-black/[0.03]"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around py-1.5 px-2 relative">
          {/* Left tabs */}
          {tabs.slice(0, 2).map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[56px] min-h-[44px] transition-colors ${
                isActive(tab.path)
                  ? "text-coral"
                  : "text-gray-500 dark:text-dark-muted"
              }`}
              aria-label={tab.label}
              aria-current={isActive(tab.path) ? "page" : undefined}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}

          {/* Raised FAB */}
          <div className="relative -mt-6">
            <button
              onClick={handleFabClick}
              className="w-14 h-14 bg-gradient-to-br from-coral to-[#f7a072] hover:from-coral-light hover:to-[#f9b088] text-white rounded-full shadow-lg shadow-coral/30 flex items-center justify-center text-2xl font-bold active:scale-90 transition-transform"
              aria-label="Quick add expense"
            >
              +
            </button>
          </div>

          {/* Right tabs */}
          {tabs.slice(2).map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[56px] min-h-[44px] transition-colors ${
                isActive(tab.path)
                  ? "text-coral"
                  : "text-gray-500 dark:text-dark-muted"
              }`}
              aria-label={tab.label}
              aria-current={isActive(tab.path) ? "page" : undefined}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg min-w-[56px] min-h-[44px] transition-colors ${
              moreTabs.some((t) => isActive(t.path))
                ? "text-coral"
                : "text-gray-500 dark:text-dark-muted"
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
