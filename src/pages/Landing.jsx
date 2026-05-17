import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: "📊",
    title: "Smart Analytics",
    desc: "Daily trends, category breakdowns, savings gauges — see where every rupee goes.",
  },
  {
    icon: "🔄",
    title: "Life Contexts",
    desc: "Separate budgets for college, first job, new city. Compare spending across phases.",
  },
  {
    icon: "🔒",
    title: "100% Private",
    desc: "No servers. No accounts. Data stays on your device. Works offline as a PWA.",
  },
  {
    icon: "🗣️",
    title: "Natural Language",
    desc: 'Type "500 chai yesterday" or "200 auto, 150 coffee" — we understand.',
  },
  {
    icon: "🔁",
    title: "Recurring Tracker",
    desc: "Auto-detect subscriptions and recurring bills. Never miss a payment.",
  },
  {
    icon: "📱",
    title: "Mobile-First PWA",
    desc: "Install on your phone. Works offline. Syncs across devices via export/Gist.",
  },
];

const trustBadges = [
  "No signup required",
  "No server or cloud",
  "100% privacy",
  "Offline-first PWA",
  "Free forever",
  "Open source",
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-cream dark:bg-dark">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-navy dark:text-white leading-tight">
          Context<span className="text-coral">Money</span>
        </h1>
        <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-dark-muted max-w-2xl mx-auto">
          Track expenses across life phases — college, first job, new city.
          Privacy-first, offline, no signup.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-8 px-8 py-4 bg-coral hover:bg-coral-light text-white rounded-2xl font-heading font-bold text-lg transition-colors shadow-lg shadow-coral/25 active:scale-95 min-h-[56px]"
        >
          Start Tracking →
        </button>
        <p className="mt-3 text-sm text-gray-400 dark:text-dark-muted">
          No signup. Data stays on your device.
        </p>
      </section>

      {/* Trust Badges */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {trustBadges.map((badge) => (
            <span
              key={badge}
              className="px-4 py-2 bg-white dark:bg-dark-card rounded-full text-sm font-medium text-navy dark:text-dark-text border border-gray-200 dark:border-dark-border"
            >
              ✓ {badge}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-heading font-bold text-navy dark:text-white text-center mb-8">
          Everything you need. Nothing you don&apos;t.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-dark-card rounded-2xl p-5 border border-gray-100 dark:border-dark-border"
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="mt-3 text-base font-heading font-bold text-navy dark:text-white">
                {f.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OG preview */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border overflow-hidden shadow-lg">
          <img
            src="/og-image.svg"
            alt="ContextMoney dashboard preview"
            className="w-full"
            loading="lazy"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-16 text-center">
        <h2 className="text-2xl font-heading font-bold text-navy dark:text-white mb-4">
          Ready to take control?
        </h2>
        <button
          onClick={() => navigate("/")}
          className="px-8 py-4 bg-coral hover:bg-coral-light text-white rounded-2xl font-heading font-bold text-lg transition-colors shadow-lg shadow-coral/25 active:scale-95 min-h-[56px]"
        >
          Start Tracking — It&apos;s Free →
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-dark-border py-8 text-center">
        <p className="text-sm text-gray-400 dark:text-dark-muted">
          Context<span className="text-coral font-medium">Money</span> · v2.0 ·
          Made with privacy in mind
        </p>
        <div className="mt-2 flex justify-center gap-4 text-sm text-gray-400">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-coral"
          >
            GitHub
          </a>
          <span>·</span>
          <a href="/sitemap.xml" className="hover:text-coral">
            Sitemap
          </a>
        </div>
      </footer>
    </div>
  );
}
