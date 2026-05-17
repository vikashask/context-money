import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3000) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    {
      success: (msg, duration) => addToast(msg, "success", duration),
      error: (msg, duration) => addToast(msg, "error", duration ?? 5000),
      warning: (msg, duration) => addToast(msg, "warning", duration),
      info: (msg, duration) => addToast(msg, "info", duration),
    },
    [addToast],
  );

  // Reassign methods so they are callable
  const toastObj = {
    success: (msg, duration) => addToast(msg, "success", duration),
    error: (msg, duration) => addToast(msg, "error", duration ?? 5000),
    warning: (msg, duration) => addToast(msg, "warning", duration),
    info: (msg, duration) => addToast(msg, "info", duration),
    dismiss: removeToast,
  };

  return (
    <ToastContext.Provider value={toastObj}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICONS = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

const STYLES = {
  success: "bg-green-600 text-white",
  error: "bg-red-500 text-white",
  warning: "bg-yellow-500 text-white",
  info: "bg-navy dark:bg-dark-card text-white dark:text-dark-text border border-gray-200 dark:border-dark-border",
};

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 left-4 md:left-auto md:w-80 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  };

  return (
    <div
      className={`pointer-events-auto rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 transition-all duration-200 ${
        isExiting
          ? "opacity-0 translate-x-4"
          : "opacity-100 translate-x-0 animate-fade-in-up"
      } ${STYLES[toast.type]}`}
      role="alert"
    >
      <span className="text-sm font-bold flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white/20">
        {ICONS[toast.type]}
      </span>
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-white/70 hover:text-white transition-colors text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
