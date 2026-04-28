import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { db, initDB } from './db';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Analytics from './pages/Analytics';
import Compare from './pages/Compare';
import Simulator from './pages/Simulator';
import Settings from './pages/Settings';

export default function App() {
  const { darkMode, hasOnboarded, setHasOnboarded, activeContextId, setActiveContextId, incrementVisitCount } = useStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDB().then(async () => {
      // Recovery: if localStorage says onboarded but DB has no contexts, reset onboarding
      if (hasOnboarded) {
        const count = await db.contexts.count();
        if (count === 0) {
          setHasOnboarded(false);
          setActiveContextId(null);
        } else if (activeContextId) {
          // Verify active context still exists
          const ctx = await db.contexts.get(activeContextId);
          if (!ctx) {
            const first = await db.contexts.toCollection().first();
            setActiveContextId(first?.id || null);
          }
        } else {
          // No active context set, pick the first one
          const first = await db.contexts.toCollection().first();
          if (first) setActiveContextId(first.id);
        }
      }
      setDbReady(true);
    });
    incrementVisitCount();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === '/' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        document.getElementById('quick-add-input')?.focus();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('[data-modal-close]').forEach((el) => el.click());
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!dbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-dark">
        <div className="text-navy dark:text-dark-text text-lg font-heading">Loading...</div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <BrowserRouter>
        <Onboarding />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream dark:bg-dark pb-20 md:pb-4">
        <Header />
        <main className="max-w-3xl mx-auto px-4 pt-2 pb-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </BrowserRouter>
  );
}
