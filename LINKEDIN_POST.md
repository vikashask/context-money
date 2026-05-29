# LinkedIn Post — ContextMoney

---

## Post Option 1: Feature-Focused (Recommended)

---

🚀 Excited to share my latest project — **ContextMoney**, a privacy-first expense tracker I built from scratch!

💡 **The idea:** Most expense apps require sign-ups, send your data to the cloud, and charge subscriptions. I wanted something different — an app that works **entirely on your device**, with **zero accounts** and **zero servers**.

---

### What makes ContextMoney different?

📂 **Multi-Context Profiles** — Track finances across different life chapters (college, first job, new city, abroad) in separate profiles with their own budgets and categories.

⚡ **Natural Language Input** — Just type "500 chai yesterday" or "200 auto, 150 coffee" — it parses the amount, category, and date automatically.

📊 **Smart Insights** — Detects spending patterns, recurring subscriptions, weekend splurges, and budget warnings — no manual setup needed.

🔮 **What-If Simulator** — Adjust income and spending sliders to project your savings rate for different life scenarios.

📱 **Installable PWA** — Works offline, installs on your home screen like a native app, no App Store needed.

🔒 **100% Private** — Your data never leaves your device. Export/import JSON. Optional GitHub Gist sync for cross-device use — you own the sync.

---

### Built with:

⚛️ React 19 + Vite 8
🎨 Tailwind CSS 4 + Framer Motion
🗄️ Dexie (IndexedDB) — offline-first local DB
🏪 Zustand — lightweight state management
📈 Recharts — interactive charts
🧪 Vitest + Playwright — tested end-to-end

---

This was a deep dive into **offline-first architecture**, **PWA internals**, **IndexedDB with live reactive queries**, and **natural language parsing** without any AI APIs.

Would love to hear your thoughts! 💬

#ReactJS #WebDevelopment #PWA #JavaScript #FinTech #OpenSource #FrontendDevelopment #Vite #IndieHacker #PersonalFinance

---

---

## Post Option 2: Story-Driven (More Personal)

---

I got tired of expense apps that:
❌ Required creating an account
❌ Sent my financial data to unknown servers
❌ Made me tap through 5 screens to log a ₹50 chai

So I built **ContextMoney** — a personal finance tracker where **you own your data, completely**.

Here's what I learned building it 👇

**1/ Offline-first is hard but worth it**
Everything lives in IndexedDB via Dexie. No API calls. No loading spinners for your own data. It's instant.

**2/ Natural language parsing changes UX completely**
Instead of forms, users type "500 chai yesterday" and the app figures out the rest. Built a custom parser with 100+ keyword mappings for Indian apps (Swiggy, Zomato, Ola, Rapido...).

**3/ PWA is underrated**
vite-plugin-pwa + Workbox gave me installable app + offline mode + auto-updates for free. No App Store, no review process.

**4/ Zustand + Dexie live queries = perfect combo**
Zustand handles app settings (theme, active context). Dexie's useLiveQuery handles reactive data. No Redux, no React Query — and the app feels snappy.

**5/ Code-split everything**
All pages lazy-loaded with React.lazy(). Initial bundle is tiny. Pages load on demand.

Tech: React 19 · Vite 8 · Tailwind CSS 4 · Dexie · Zustand · Recharts · Framer Motion · Vitest · Playwright

What would you add to a privacy-first expense tracker? 👇

#ReactJS #WebDev #JavaScript #PWA #OpenSource #PersonalFinance #IndieHacker #FrontendDevelopment #BuiltWithReact

---

---

## Post Option 3: Short & Punchy (High Engagement)

---

Built a full expense tracker that:

✅ Works 100% offline
✅ Needs zero sign-up
✅ Understands "500 chai yesterday"
✅ Installs like a native app (PWA)
✅ Your data never leaves your phone

Called it **ContextMoney** — because your finances look different in every life context (college → job → new city → abroad).

Tech stack: React 19 + Vite + Dexie + Zustand + Tailwind + Recharts

What feature should every expense app have that most miss?

Drop it below 👇

#React #JavaScript #PWA #PersonalFinance #WebDevelopment #OpenSource

---

---

## Hashtag Sets (Copy & Paste)

### Technical Audience
```
#ReactJS #Vite #JavaScript #TypeScript #PWA #IndexedDB #Zustand #WebDevelopment
#FrontendDevelopment #OfflineFirst #OpenSource #BuiltWithReact #WebPerformance
```

### Finance/Product Audience
```
#PersonalFinance #FinTech #ExpenseTracker #MoneyManagement #IndieHacker
#ProductHunt #SideProject #BuildInPublic
```

### India-Specific
```
#MadeInIndia #IndianDeveloper #ReactIndia #TechInIndia #StartupIndia
```

---

## Tips for Posting

1. **Add a screenshot or screen recording** — the dashboard or quick-add input in action gets the most clicks
2. **Post on Tuesday–Thursday, 8–10 AM or 12–2 PM** for best LinkedIn reach
3. **Tag relevant tools** — @Vite, @Tailwind if posting on Twitter/X
4. **Engage in first 30 min** — reply to every comment quickly to boost algorithm
5. **Pin a comment** with your GitHub/live link so it's easy to find

---

*ContextMoney — Privacy-First Expense Tracker*
