import {
  differenceInCalendarDays,
  format,
  startOfDay,
  subDays,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "../db";
import { getCurrencySymbol, useStore } from "../store";

const ACHIEVEMENTS = [
  {
    id: "first_expense",
    icon: "🌱",
    name: "First Step",
    desc: "Added your first expense",
    check: (stats) => stats.totalExpenses >= 1,
  },
  {
    id: "ten_expenses",
    icon: "📝",
    name: "Getting Started",
    desc: "Logged 10 expenses",
    check: (stats) => stats.totalExpenses >= 10,
  },
  {
    id: "fifty_expenses",
    icon: "📊",
    name: "Data Driven",
    desc: "Logged 50 expenses",
    check: (stats) => stats.totalExpenses >= 50,
  },
  {
    id: "hundred_expenses",
    icon: "💯",
    name: "Century Club",
    desc: "Logged 100 expenses",
    check: (stats) => stats.totalExpenses >= 100,
  },
  {
    id: "week_streak",
    icon: "🔥",
    name: "On Fire",
    desc: "7-day logging streak",
    check: (stats) => stats.currentStreak >= 7,
  },
  {
    id: "month_streak",
    icon: "⚡",
    name: "Unstoppable",
    desc: "30-day logging streak",
    check: (stats) => stats.currentStreak >= 30,
  },
  {
    id: "under_budget",
    icon: "🎯",
    name: "Budget Master",
    desc: "Stayed under budget this month",
    check: (stats) => stats.underBudget,
  },
  {
    id: "saver",
    icon: "💰",
    name: "Super Saver",
    desc: "Saved 30%+ of income",
    check: (stats) => stats.savingsRate >= 30,
  },
  {
    id: "five_categories",
    icon: "🏷️",
    name: "Categorized",
    desc: "Used 5+ categories",
    check: (stats) => stats.categoriesUsed >= 5,
  },
  {
    id: "low_spend_day",
    icon: "🧘",
    name: "Frugal Day",
    desc: "Had a no-spend day",
    check: (stats) => stats.hasNoSpendDay,
  },
  {
    id: "consistent",
    icon: "📅",
    name: "Consistent",
    desc: "Logged expenses 20+ days/month",
    check: (stats) => stats.daysLogged >= 20,
  },
  {
    id: "early_bird",
    icon: "🐦",
    name: "Early Bird",
    desc: "Logged an expense before 8 AM",
    check: (stats) => stats.hasEarlyLog,
  },
];

export default function Achievements() {
  const { activeContextId, currency } = useStore();
  const sym = getCurrencySymbol(currency);

  const expenses = useLiveQuery(
    () =>
      activeContextId
        ? db.expenses.where("contextId").equals(activeContextId).toArray()
        : [],
    [activeContextId],
  );

  const context = useLiveQuery(
    () => (activeContextId ? db.contexts.get(activeContextId) : null),
    [activeContextId],
  );

  const stats = useMemo(() => {
    if (!expenses || !context) return null;

    const totalExpenses = expenses.length;
    const now = new Date();
    const today = startOfDay(now);

    // Calculate streak: consecutive days with at least 1 expense
    const uniqueDays = new Set(
      expenses.map((e) => format(new Date(e.date), "yyyy-MM-dd")),
    );
    let currentStreak = 0;
    let checkDay = today;
    // If no expense today, start checking from yesterday
    if (!uniqueDays.has(format(today, "yyyy-MM-dd"))) {
      checkDay = subDays(today, 1);
    }
    while (uniqueDays.has(format(checkDay, "yyyy-MM-dd"))) {
      currentStreak++;
      checkDay = subDays(checkDay, 1);
    }

    // Current month expenses
    const thisMonth = expenses.filter((e) => {
      const d = new Date(e.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });
    const monthlySpent = thisMonth.reduce((s, e) => s + e.amount, 0);
    const underBudget =
      context.monthlyBudget > 0 && monthlySpent <= context.monthlyBudget;
    const savingsRate =
      context.monthlyIncome > 0
        ? ((context.monthlyIncome - monthlySpent) / context.monthlyIncome) * 100
        : 0;

    // Categories used
    const categoriesUsed = new Set(expenses.map((e) => e.category)).size;

    // No-spend days (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) =>
      format(subDays(today, i), "yyyy-MM-dd"),
    );
    const daysWithSpend = new Set(
      expenses
        .filter((e) => differenceInCalendarDays(today, new Date(e.date)) <= 30)
        .map((e) => format(new Date(e.date), "yyyy-MM-dd")),
    );
    const hasNoSpendDay = last30Days.some((d) => !daysWithSpend.has(d));

    // Days logged this month
    const thisMonthDays = new Set(
      thisMonth.map((e) => format(new Date(e.date), "yyyy-MM-dd")),
    );
    const daysLogged = thisMonthDays.size;

    // Early bird check (before 8 AM)
    const hasEarlyLog = expenses.some((e) => {
      const created = new Date(e.createdAt);
      return created.getHours() < 8;
    });

    return {
      totalExpenses,
      currentStreak,
      underBudget,
      savingsRate,
      categoriesUsed,
      hasNoSpendDay,
      daysLogged,
      hasEarlyLog,
    };
  }, [expenses, context]);

  if (!stats) return null;

  const unlockedAchievements = ACHIEVEMENTS.filter((a) => a.check(stats));
  const lockedAchievements = ACHIEVEMENTS.filter((a) => !a.check(stats));

  return (
    <div className="bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/80 dark:border-dark-border card-elevated animate-fade-in-up">
      {/* Streak Display */}
      <div className="flex items-center gap-4 mb-5">
        <div className="relative">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl ${stats.currentStreak >= 7 ? "bg-gradient-to-br from-orange-400 to-red-500 animate-glow" : "bg-gray-100 dark:bg-dark-border"}`}
          >
            {stats.currentStreak >= 7 ? "🔥" : "📅"}
          </div>
          {stats.currentStreak >= 7 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] font-bold text-yellow-900 animate-bounce-in">
              ⚡
            </div>
          )}
        </div>
        <div>
          <p className="text-2xl font-heading font-bold text-navy dark:text-dark-text">
            {stats.currentStreak} day{stats.currentStreak !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-muted">
            {stats.currentStreak >= 7
              ? "Amazing streak! Keep it up! 🎉"
              : stats.currentStreak >= 3
                ? "Nice streak building!"
                : "Log daily to build your streak"}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-bold text-navy dark:text-dark-text font-mono-amount">
            {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </p>
          <p className="text-[10px] text-gray-400 dark:text-dark-muted">
            Unlocked
          </p>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-4 gap-2">
        {unlockedAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex flex-col items-center p-2 rounded-xl bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100 dark:border-amber-800/30 stagger-item"
            title={`${achievement.name}: ${achievement.desc}`}
          >
            <span className="text-2xl mb-0.5">{achievement.icon}</span>
            <span className="text-[9px] font-medium text-center text-amber-800 dark:text-amber-300 leading-tight">
              {achievement.name}
            </span>
          </div>
        ))}
        {lockedAchievements
          .slice(0, 8 - unlockedAchievements.length)
          .map((achievement) => (
            <div
              key={achievement.id}
              className="flex flex-col items-center p-2 rounded-xl bg-gray-50 dark:bg-dark/50 border border-gray-100 dark:border-dark-border opacity-50"
              title={achievement.desc}
            >
              <span className="text-2xl mb-0.5 grayscale">🔒</span>
              <span className="text-[9px] font-medium text-center text-gray-400 dark:text-dark-muted leading-tight">
                {achievement.name}
              </span>
            </div>
          ))}
      </div>

      {/* Next achievement hint */}
      {lockedAchievements.length > 0 && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-800/30">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <span className="font-medium">Next:</span>{" "}
            {lockedAchievements[0].icon} {lockedAchievements[0].desc}
          </p>
        </div>
      )}
    </div>
  );
}
