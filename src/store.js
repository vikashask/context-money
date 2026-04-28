import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({
      activeContextId: null,
      darkMode: false,
      hasOnboarded: false,
      currency: 'INR',
      visitCount: 0,
      installPromptDismissed: false,
      setActiveContextId: (id) => set({ activeContextId: id }),
      setDarkMode: (v) => set({ darkMode: v }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
      setCurrency: (c) => set({ currency: c }),
      incrementVisitCount: () => set((s) => ({ visitCount: s.visitCount + 1 })),
      setInstallPromptDismissed: (v) => set({ installPromptDismissed: v }),
    }),
    {
      name: 'contextmoney-settings',
    }
  )
);

export const CURRENCIES = {
  INR: { symbol: '₹', name: 'Indian Rupee' },
  USD: { symbol: '$', name: 'US Dollar' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
};

export function getCurrencySymbol(currency) {
  return CURRENCIES[currency]?.symbol || '₹';
}
