# ContextMoney — Architecture Design Document

> **Version:** 1.0 | **Date:** May 2026  
> **Stack:** React 19 · Vite 8 · Dexie (IndexedDB) · Zustand · Tailwind CSS 4 · PWA

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [System Architecture Diagram](#3-system-architecture-diagram)
4. [Tech Stack](#4-tech-stack)
5. [Application Layer Breakdown](#5-application-layer-breakdown)
6. [Data Architecture](#6-data-architecture)
7. [State Management Architecture](#7-state-management-architecture)
8. [Component Architecture](#8-component-architecture)
9. [Routing Architecture](#9-routing-architecture)
10. [PWA & Offline Architecture](#10-pwa--offline-architecture)
11. [Sync Architecture](#11-sync-architecture)
12. [Performance Architecture](#12-performance-architecture)
13. [Testing Architecture](#13-testing-architecture)
14. [Features & Advantages](#14-features--advantages)
15. [Build & Deployment Architecture](#15-build--deployment-architecture)

---

## 1. Project Overview

**ContextMoney** is a **privacy-first, offline-first Progressive Web App (PWA)** for personal expense tracking. It is designed around the concept of **"contexts"** — separate financial profiles for different life phases (college, first job, new city, abroad). All data lives exclusively on the user's device with zero backend dependency.

### Core Philosophy
| Principle | Implementation |
|-----------|----------------|
| **Privacy First** | 100% local data (IndexedDB), no account required |
| **Offline First** | Service Worker + IndexedDB works without internet |
| **Mobile First** | PWA installable, bottom nav, touch gestures |
| **India First** | INR default, Indian brand keywords (Swiggy, Zomato, Ola) |
| **Zero Friction** | Natural language input, smart auto-categorization |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                    │
│  Landing → Onboarding → Dashboard → Analytics → Expenses    │
│  Compare  →  Simulator  →  Recurring  →  Settings           │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    APPLICATION LOGIC LAYER                   │
│   Zustand Store (Settings)   │   Custom React Hooks          │
│   Smart Insights Engine      │   Natural Language Parser     │
│   Recurring Pattern Detector │   Financial Health Scorer     │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      DATA ACCESS LAYER                       │
│         Dexie ORM (IndexedDB)   │   Storage Utilities        │
│         Live Queries (reactive) │   Import / Export          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      PERSISTENCE LAYER                       │
│   IndexedDB (Dexie)   │  localStorage (settings)            │
│   Service Worker Cache│  GitHub Gist (optional cloud sync)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. System Architecture Diagram

```
                        ContextMoney System Architecture
                        ─────────────────────────────────

 ┌──────────────────────────────────────────────────────────────┐
 │  Browser / PWA Shell                                          │
 │                                                               │
 │  ┌─────────────────────────────────────────────────────────┐ │
 │  │  React 19 Application                                    │ │
 │  │                                                           │ │
 │  │  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐  │ │
 │  │  │    Pages     │   │  Components  │  │   Hooks      │  │ │
 │  │  │              │   │              │  │              │  │ │
 │  │  │  Dashboard   │   │  QuickAdd    │  │ useExpenses  │  │ │
 │  │  │  Analytics   │   │  Header      │  │ useContexts  │  │ │
 │  │  │  Expenses    │   │  BottomNav   │  │ useCategories│  │ │
 │  │  │  Recurring   │   │  Toast       │  │ useDebounce  │  │ │
 │  │  │  Simulator   │   │  VirtualList │  │ useInView    │  │ │
 │  │  │  Compare     │   │  SwipeRow    │  │              │  │ │
 │  │  │  Settings    │   │  AnimatedNum │  │              │  │ │
 │  │  └──────┬───────┘   └──────┬───────┘  └──────┬───────┘  │ │
 │  │         │                  │                  │           │ │
 │  │  ┌──────▼──────────────────▼──────────────────▼───────┐  │ │
 │  │  │              Zustand Global Store                    │  │ │
 │  │  │  theme | activeContext | currency | onboarded        │  │ │
 │  │  └──────────────────────┬────────────────────────────┘  │ │
 │  │                         │                                │ │
 │  │  ┌──────────────────────▼────────────────────────────┐  │ │
 │  │  │           Dexie (IndexedDB ORM)                    │  │ │
 │  │  │                                                    │  │ │
 │  │  │  [contexts]  [expenses]  [categories]              │  │ │
 │  │  │  [recurringExpenses]                               │  │ │
 │  │  └──────────────────────┬────────────────────────────┘  │ │
 │  └─────────────────────────│─────────────────────────────┘  │
 │                            │                                  │
 │  ┌─────────────────────────▼────────────────────┐           │
 │  │  IndexedDB (Browser Native Storage)           │           │
 │  └───────────────────────────────────────────────┘           │
 │                                                               │
 │  ┌─────────────────────────────────────────────────────────┐ │
 │  │  Service Worker (Workbox via vite-plugin-pwa)            │ │
 │  │  • Precaches app shell (JS, CSS, HTML)                   │ │
 │  │  • Runtime caches Google Fonts                           │ │
 │  │  • Auto-updates in background                            │ │
 │  └─────────────────────────────────────────────────────────┘ │
 └──────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────▼──────────┐
                          │  GitHub Gist API    │
                          │  (Optional Sync)    │
                          └────────────────────┘
```

---

## 4. Tech Stack

### Core Framework

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| UI Framework | React | 19.2.5 | Component-based UI rendering |
| Build Tool | Vite | 8.0.10 | Fast bundling, HMR dev server |
| Styling | Tailwind CSS | 4.2.4 | Utility-first CSS (via Vite plugin) |
| Animations | Motion (Framer) | 12.38.0 | Page transitions, micro-animations |

### State & Data

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Global State | Zustand | 5.0.12 | Lightweight state with persistence |
| Database | Dexie | 4.4.2 | IndexedDB ORM with migrations |
| Reactive Queries | Dexie React Hooks | 4.4.0 | Live re-renders on DB changes |
| Compression | lz-string | 1.5.0 | Compress export/sync payloads |

### Routing & Navigation

| Technology | Version | Purpose |
|-----------|---------|---------|
| React Router DOM | 7.14.2 | Client-side routing with lazy loading |

### Visualization

| Technology | Version | Purpose |
|-----------|---------|---------|
| Recharts | 3.8.1 | Bar, Line, Pie, Composed charts |
| TanStack Virtual | 3.13.24 | Virtual scrolling for large lists |

### PWA & Performance

| Technology | Version | Purpose |
|-----------|---------|---------|
| vite-plugin-pwa | 1.2.0 | Service worker, manifest |
| vite-plugin-compression | 0.5.1 | Gzip + Brotli output compression |
| date-fns | 4.1.0 | Date manipulation utilities |

### Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| Vitest | 4.1.5 | Unit & component testing |
| Testing Library React | 16.3.2 | Component testing utilities |
| Playwright | 1.59.1 | End-to-end browser testing |
| Happy-dom / jsdom | 20.9 / 29.1 | DOM simulation for tests |

---

## 5. Application Layer Breakdown

### Pages (Routes)

```
/                  → Landing      (marketing/info page)
/onboarding        → Onboarding   (3-step guided setup)
/dashboard         → Dashboard    (overview: spent, budget, insights)
/expenses          → Expenses     (list, search, filter, manage)
/analytics         → Analytics    (charts: daily, category, monthly, annual)
/recurring         → Recurring    (subscriptions & recurring bill tracker)
/simulator         → Simulator    (what-if spending scenario modeler)
/compare           → Compare      (side-by-side context comparison)
/settings          → Settings     (context, categories, theme, export)
```

> All pages except Dashboard are **lazy-loaded** via `React.lazy()` + `Suspense` to minimize initial bundle size.

### Smart Utilities

```
src/utils/
├── expenseParser.js    Natural language → structured expense data
│                       e.g. "500 chai yesterday" → {amount:500, category:'Food', date: yesterday}
├── storage.js          Import/export with merge & conflict resolution
└── sync.js             GitHub Gist bi-directional sync
```

---

## 6. Data Architecture

### Database Schema (Dexie / IndexedDB)

```
Database: ContextMoneyDB (v2)

┌─────────────────────────────────────────────────────┐
│  Table: contexts                                     │
│  ─────────────────────────────────────────────────  │
│  id (auto)  │  name  │  monthlyBudget  │  income     │
│  currency   │  isArchived  │  createdAt               │
│  Indexes: id, name, isArchived                       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Table: expenses                                     │
│  ─────────────────────────────────────────────────  │
│  id (auto)  │  contextId  │  amount  │  category     │
│  note       │  date       │  createdAt │  isRecurring │
│  tags[]                                              │
│  Indexes: id, contextId, category, date, tags        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Table: categories                                   │
│  ─────────────────────────────────────────────────  │
│  id (auto)  │  name  │  icon  │  color  │  keywords[] │
│  budgetLimit                                         │
│  Indexes: id, name                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Table: recurringExpenses                            │
│  ─────────────────────────────────────────────────  │
│  id (auto)  │  contextId  │  name  │  amount         │
│  category   │  frequency  │  nextDueDate  │  isActive │
│  Indexes: id, contextId, category, nextDueDate       │
└─────────────────────────────────────────────────────┘
```

### Data Flow

```
User Input (QuickAdd / Form)
       │
       ▼
Natural Language Parser (expenseParser.js)
       │ → extracts: amount, category, date, note
       ▼
Dexie DB Write (expenses.add / expenses.put)
       │
       ▼
Dexie React Hooks (useLiveQuery)
       │ → auto re-renders subscribed components
       ▼
UI Update (Dashboard totals, Expense list, Charts)
```

---

## 7. State Management Architecture

### Two-Layer State Strategy

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Zustand Store  (Persistent App Settings)        │
│  ──────────────────────────────────────────────────────  │
│  • activeContextId  — which financial profile is active   │
│  • theme            — 'light' | 'dark'                   │
│  • currency         — 'INR' | 'USD' | 'AED' | etc.       │
│  • isOnboarded      — whether setup is complete           │
│  • Persisted via localStorage ('contextmoney-settings')   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Layer 2: Dexie Live Queries  (Reactive DB State)         │
│  ──────────────────────────────────────────────────────  │
│  • All expenses, categories, contexts, recurring data     │
│  • useLiveQuery() — updates components on DB changes      │
│  • No Redux/Context API boilerplate needed               │
└──────────────────────────────────────────────────────────┘
```

### Why This Approach?
- **No server** → no Redux Thunk / React Query / SWR needed
- **Zustand** is 1kb and handles synchronous settings perfectly
- **Dexie live queries** replace async data fetching entirely — writes propagate automatically to all consumers

---

## 8. Component Architecture

### Component Hierarchy

```
App.jsx
├── ErrorBoundary
├── Router (React Router v7)
│   ├── PageTransition (Framer Motion wrapper)
│   │   ├── Landing
│   │   ├── Onboarding
│   │   ├── Dashboard
│   │   │   ├── Header
│   │   │   ├── AnimatedNumber (budget stats)
│   │   │   ├── QuickAdd (natural language input)
│   │   │   └── Toast (notifications)
│   │   ├── Expenses
│   │   │   ├── Header
│   │   │   ├── VirtualList → SwipeableRow (expense items)
│   │   │   └── CategoryPicker (filter)
│   │   ├── Analytics
│   │   │   └── Recharts (Bar, Line, Pie charts)
│   │   ├── Recurring
│   │   ├── Simulator
│   │   │   └── AnimatedNumber (projections)
│   │   ├── Compare
│   │   └── Settings
│   │       └── TagInput
│   └── BottomNav (mobile navigation)
└── InstallBanner (PWA install prompt)
```

### Reusable Components

| Component | Purpose |
|-----------|---------|
| `AnimatedNumber` | Count-up animation for financial figures |
| `BottomNav` | Mobile navigation with FAB (quick-add button) |
| `CategoryPicker` | Dropdown with icon + color category selection |
| `ErrorBoundary` | React error boundary for graceful crash handling |
| `Header` | Page title + context switcher |
| `InstallBanner` | PWA installation prompt banner |
| `PageTransition` | Animated route transition wrapper |
| `QuickAdd` | Natural language expense input with suggestions |
| `Skeleton` | Loading placeholder UI |
| `SwipeableRow` | Touch-swipe to delete expense row |
| `TagInput` | Multi-tag input with add/remove |
| `Toast` | Stackable notification system |
| `VirtualList` | Virtualized scrollable list (TanStack Virtual) |

---

## 9. Routing Architecture

```
React Router DOM v7 (client-side, hash-free routing)

Protected Flow:
  / (Landing)
    └─→ /onboarding  (if not onboarded)
          └─→ /dashboard  (after setup)

Main App Routes (require onboarding):
  /dashboard   (eager loaded — primary landing)
  /expenses    (lazy)
  /analytics   (lazy)
  /recurring   (lazy)
  /simulator   (lazy)
  /compare     (lazy)
  /settings    (lazy)
```

> Lazy loading = separate JS chunks per page → faster initial load, pages only downloaded on visit.

---

## 10. PWA & Offline Architecture

```
PWA Architecture
─────────────────

1. App Shell Caching
   Service Worker precaches all JS/CSS/HTML on install.
   User gets instant load even with no network.

2. Data Persistence
   All financial data in IndexedDB (Dexie).
   Works 100% offline — no network calls for core features.

3. Install Experience
   Web App Manifest: standalone display mode.
   InstallBanner component captures beforeinstallprompt.
   Icons: 192px, 512px, maskable variants, Apple touch icon.

4. Auto-Update Strategy
   vite-plugin-pwa registers new SW on background tab.
   User notified of update; refresh applies new version.

5. Font Caching
   Google Fonts cached at runtime by Workbox.
   Subsequent loads use cached fonts instantly.
```

---

## 11. Sync Architecture

```
GitHub Gist Sync (Optional, user-initiated)
──────────────────────────────────────────

Device A                           Device B
   │                                  │
   │  exportAllData()                 │
   │  lz-string compress              │
   │         │                        │
   │         ▼                        │
   │  GitHub Gist API (private)       │
   │  POST /gists → gistId            │
   │         │                        │
   │         │         loadFromGist() │
   │         │                ◄───────│
   │         │         PATCH /gists   │
   │         │         lz-string decompress
   │         │                        │
   │         │     Merge Strategy:    │
   │         │     • Contexts: by name│
   │         │     • Expenses: by     │
   │         │       fingerprint      │
   │         │       (contextId +     │
   │         │        amount + date + │
   │         │        category + note)│
   │         │     • newer wins       │
   └─────────┴────────────────────────┘
```

---

## 12. Performance Architecture

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| **Code Splitting** | `React.lazy()` per page | Smaller initial bundle |
| **Gzip + Brotli** | vite-plugin-compression | 60–80% smaller transfer size |
| **Virtual Scrolling** | TanStack React Virtual | Smooth scroll through 1000+ expenses |
| **Debounced Search** | `useDebounce(300ms)` | No re-query on every keypress |
| **Live Queries** | Dexie `useLiveQuery` | No polling, zero wasted renders |
| **Skeleton UI** | `Skeleton` component | Perceived performance improvement |
| **Lazy Images** | Intersection Observer | Images load only when in viewport |
| **Memoized Charts** | `useMemo` on chart data | No recompute on unrelated state changes |

---

## 13. Testing Architecture

```
Testing Pyramid
──────────────

         ┌─────────┐
         │  E2E    │  Playwright (smoke.spec.js)
         │  Tests  │  Chromium + Mobile Chrome
         └────┬────┘
              │
      ┌───────┴────────┐
      │  Component &   │  Vitest + React Testing Library
      │  Integration   │  QuickAdd.test.jsx
      │  Tests         │  storage.test.js
      └───────┬────────┘
              │
      ┌───────┴────────┐
      │  Unit Tests    │  Vitest + jsdom/happy-dom
      │                │  expenseParser.test.js
      │                │  utils.test.js
      └────────────────┘

Test Commands:
  npm run test          → Vitest (all unit/component)
  npm run test:watch    → Vitest watch mode
  npm run test:e2e      → Playwright smoke tests
```

---

## 14. Features & Advantages

### Key Features

#### 💰 Core Expense Management
- Add expenses via natural language ("500 chai yesterday") or form
- Auto-categorization from 100+ keywords (Swiggy→Food, Uber→Transport)
- Bulk delete with multi-select; swipe-to-delete on mobile
- Search & filter by category, date range, and note text
- Tagging support on all expenses

#### 📊 Analytics & Insights
- Daily trend bars, category pie charts, monthly stacked bars, year overview
- Smart nudges: category alerts, weekend spending patterns, budget warnings
- Financial Health Score based on savings rate + spending distribution
- Month-over-month change tracking (+/-% indicators)

#### 🔄 Multi-Context Profiles
- Separate financial profiles per life phase (college, job, city, abroad)
- Side-by-side comparison with currency conversion (INR, USD, AED, EUR, GBP, SGD)
- Independent income, budget, and category settings per context

#### 🔮 Smart Tools
- What-If Simulator with interactive sliders for savings scenario modelling
- Recurring Pattern Detection from expense history
- Subscription/recurring bill manager with due-date tracking

#### 🔒 Privacy & Data Control
- Zero sign-up, zero server, zero tracking
- All data stays on your device (IndexedDB)
- Export to JSON, import from JSON with merge resolution
- Optional GitHub Gist sync for cross-device use

#### 📱 PWA & Mobile Experience
- Install to home screen (Android, iOS, Desktop)
- 100% offline functionality
- Swipe gestures, bottom navigation, floating action button
- Dark mode

### Competitive Advantages

| Advantage | Description |
|-----------|-------------|
| **Zero Backend** | No servers to maintain, no accounts to manage, no data breaches |
| **Offline First** | Works on flight mode, slow connections, or no internet |
| **India Optimized** | INR default, Indian apps/brands in keyword map |
| **Natural Language Input** | Fastest expense logging — just type naturally |
| **Multi-Context Design** | Unique concept: track finances across life chapters |
| **Instant Performance** | Lazy loading, virtual scrolling, compressed assets |
| **Fully Testable** | Unit + E2E tests ensure reliability |
| **Open Source Ready** | Standard Vite/React stack, easy to contribute |

---

## 15. Build & Deployment Architecture

```
Build Pipeline
──────────────

Source (src/)
     │
     ▼
Vite 8 (Bundler)
├── @vitejs/plugin-react (Oxc compiler — faster than Babel)
├── @tailwindcss/vite (no PostCSS step needed)
├── vite-plugin-pwa (generates SW + manifest)
└── vite-plugin-compression (gzip + brotli)
     │
     ▼
dist/ (production build)
├── index.html
├── assets/
│   ├── index.[hash].js      (main bundle)
│   ├── Dashboard.[hash].js  (eager page)
│   ├── Analytics.[hash].js  (lazy chunk)
│   ├── Expenses.[hash].js   (lazy chunk)
│   └── ... (per-page chunks)
├── sw.js                    (service worker)
├── manifest.webmanifest     (PWA manifest)
└── *.gz / *.br              (compressed variants)

Deployment Targets (all static hosting):
  ✓ Vercel     (zero-config, auto-deploy from Git)
  ✓ Netlify    (drag-and-drop or Git integration)
  ✓ GitHub Pages (free, custom domain support)
  ✓ Cloudflare Pages (global CDN edge delivery)

No backend, no database server, no Docker, no DevOps.
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    ContextMoney at a Glance                      │
├─────────────────┬───────────────────────────────────────────────┤
│ Frontend        │ React 19 + Vite 8 + Tailwind CSS 4            │
│ State           │ Zustand (settings) + Dexie live queries (data) │
│ Storage         │ IndexedDB via Dexie (schema v2, migrations)    │
│ Animations      │ Motion (Framer) — page transitions + numbers   │
│ Charts          │ Recharts — bar, line, pie, composed            │
│ Routing         │ React Router v7 — lazy-loaded page chunks      │
│ PWA             │ Workbox via vite-plugin-pwa                    │
│ Sync            │ GitHub Gist API (optional, user-owned)         │
│ Testing         │ Vitest + React Testing Library + Playwright    │
│ Build           │ Vite with gzip + brotli compression            │
│ Deploy          │ Any static host (Vercel / Netlify / GH Pages)  │
│ Backend         │ None required                                  │
│ Database Server │ None required                                  │
└─────────────────┴───────────────────────────────────────────────┘
```

---

*Generated for ContextMoney — Privacy-First Expense Tracker*
