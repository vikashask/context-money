import { useEffect, useState } from "react";
import { useStore } from "../store";

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const { installPromptDismissed, setInstallPromptDismissed } = useStore();

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (installPromptDismissed) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [installPromptDismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setInstallPromptDismissed(true);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:max-w-sm z-50 animate-fade-in-up">
      <div className="bg-white dark:bg-dark-card rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-dark-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">📱</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy dark:text-dark-text">
            Install ContextMoney
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-muted">
            Add to home screen for offline use
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-coral text-white rounded-lg text-xs font-medium hover:bg-coral-light transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
