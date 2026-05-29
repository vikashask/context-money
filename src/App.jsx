import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";
import InstallBanner from "./components/InstallBanner";
import PageTransition from "./components/PageTransition";
import Skeleton from "./components/Skeleton";
import { db, initDB } from "./db";
import Dashboard from "./pages/Dashboard";
import { useStore } from "./store";

// Lazy-loaded pages for code splitting
const Analytics = lazy(() => import("./pages/Analytics"));
const Compare = lazy(() => import("./pages/Compare"));
const Expenses = lazy(() => import("./pages/Expenses"));
const Goals = lazy(() => import("./pages/Goals"));
const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Recurring = lazy(() => import("./pages/Recurring"));
const Settings = lazy(() => import("./pages/Settings"));
const Simulator = lazy(() => import("./pages/Simulator"));

function PageFallback() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default function App() {
  const {
    darkMode,
    hasOnboarded,
    setHasOnboarded,
    activeContextId,
    setActiveContextId,
    incrementVisitCount,
  } = useStore();
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
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    function handleKey(e) {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT"
      )
        return;
      if (e.key === "/" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        document.getElementById("quick-add-input")?.focus();
      }
      if (e.key === "Escape") {
        document
          .querySelectorAll("[data-modal-close]")
          .forEach((el) => el.click());
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  if (!dbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream dark:bg-dark">
        <div className="text-navy dark:text-dark-text text-lg font-heading">
          Loading...
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="*" element={<Onboarding />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-cream dark:bg-dark pb-20 md:pb-4">
        <Header />
        <main className="max-w-3xl mx-auto px-4 pt-2 pb-4">
          <Suspense fallback={<PageFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </main>
        <BottomNav />
        <InstallBanner />
      </div>
    </BrowserRouter>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <PageTransition>
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/simulator" element={<Simulator />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PageTransition>
  );
}
