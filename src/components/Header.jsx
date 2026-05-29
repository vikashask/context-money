import { useLiveQuery } from "dexie-react-hooks";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../db";
import { useStore } from "../store";

export default function Header() {
  const { activeContextId, setActiveContextId, darkMode, toggleDarkMode } =
    useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const contexts = useLiveQuery(
    () => db.contexts.where("isArchived").equals(0).toArray(),
    [],
  );
  const activeContext = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId],
  );

  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-dark-card/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-dark-border/50 shadow-sm shadow-black/[0.02]">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
          aria-label="Go to dashboard"
        >
          <span className="text-xl font-heading font-bold text-navy dark:text-white tracking-tight">
            Context<span className="gradient-text">Money</span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          {contexts && contexts.length > 0 && (
            <select
              value={activeContextId || ""}
              onChange={(e) => setActiveContextId(Number(e.target.value))}
              className="text-sm bg-gray-50/80 dark:bg-dark/80 border border-gray-200/60 dark:border-dark-border rounded-xl px-3 py-1.5 text-navy dark:text-dark-text font-medium focus:outline-none focus:ring-2 focus:ring-coral/40 max-w-[140px] truncate appearance-none"
              aria-label="Select context"
            >
              {contexts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-border/80 transition-all active:scale-90"
            aria-label={
              darkMode ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {darkMode ? "☀️" : "🌙"}
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-dark-border/80 transition-all active:scale-90"
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
