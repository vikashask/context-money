import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isWeekend,
  startOfMonth,
  subMonths,
} from "date-fns";
import { db } from "./db";

// Parse natural language expense input like "500 food lunch at cafe"
export function parseExpenseInput(input, categories) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Extract amount - find the first number in the string
  const amountMatch = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  if (amount <= 0 || isNaN(amount)) return null;

  // Remove amount from string to get remaining text
  const remaining = trimmed.replace(amountMatch[0], "").trim().toLowerCase();

  // Try to match category by keyword
  let matchedCategory = null;
  let note = remaining;

  for (const cat of categories) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const keyword of cat.keywords) {
      if (remaining.includes(keyword.toLowerCase())) {
        matchedCategory = cat;
        note = remaining.replace(keyword.toLowerCase(), "").trim();
        break;
      }
    }
    if (matchedCategory) break;
  }

  // Also try matching category name directly
  if (!matchedCategory) {
    for (const cat of categories) {
      if (remaining.includes(cat.name.toLowerCase())) {
        matchedCategory = cat;
        note = remaining.replace(cat.name.toLowerCase(), "").trim();
        break;
      }
    }
  }

  return {
    amount,
    category: matchedCategory?.name || null,
    note: note || "",
  };
}

// Get expenses for active context in a date range
export async function getExpensesForRange(contextId, startDate, endDate) {
  return db.expenses
    .where("contextId")
    .equals(contextId)
    .filter((e) => {
      const d = new Date(e.date);
      return d >= startDate && d <= endDate;
    })
    .toArray();
}

// Get expenses for current month
export async function getCurrentMonthExpenses(contextId) {
  const now = new Date();
  return getExpensesForRange(contextId, startOfMonth(now), endOfMonth(now));
}

// Calculate category totals from expenses
export function getCategoryTotals(expenses) {
  const totals = {};
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] || 0) + e.amount;
  }
  return totals;
}

// Format currency amount (with fallback for unsupported locales)
export function formatAmount(amount, symbol = "₹") {
  try {
    return `${symbol}${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  } catch {
    // Fallback if locale is not supported
    return `${symbol}${Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
}

// Insights engine - rule-based nudges
export function generateInsights(
  expenses,
  monthlyBudget,
  monthlyIncome,
  prevMonthExpenses,
  categories,
) {
  const insights = [];
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const catTotals = getCategoryTotals(expenses);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);

  // Category > 40% of total
  for (const [cat, amount] of Object.entries(catTotals)) {
    const pct = (amount / total) * 100;
    if (pct > 40 && total > 0) {
      insights.push({
        type: "warning",
        text: `${cat} is ${pct.toFixed(0)}% of spending this month — above typical 30%`,
      });
    }
  }

  // Weekend vs weekday spending
  const weekendExpenses = expenses.filter((e) => isWeekend(new Date(e.date)));
  const weekdayExpenses = expenses.filter((e) => !isWeekend(new Date(e.date)));
  const now = new Date();
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(now),
    end: now <= endOfMonth(now) ? now : endOfMonth(now),
  });
  const weekendDays = daysInMonth.filter((d) => isWeekend(d)).length || 1;
  const weekdayDays = daysInMonth.filter((d) => !isWeekend(d)).length || 1;
  const weekendAvg =
    weekendExpenses.reduce((s, e) => s + e.amount, 0) / weekendDays;
  const weekdayAvg =
    weekdayExpenses.reduce((s, e) => s + e.amount, 0) / weekdayDays;

  if (weekdayAvg > 0 && weekendAvg > weekdayAvg * 2) {
    insights.push({
      type: "info",
      text: `Weekend spending is ${(weekendAvg / weekdayAvg).toFixed(1)}x weekday average`,
    });
  }

  // Month over month increase > 20%
  if (prevTotal > 0 && total > prevTotal * 1.2) {
    const increase = (((total - prevTotal) / prevTotal) * 100).toFixed(0);
    insights.push({
      type: "warning",
      text: `You've spent ${increase}% more than last month so far`,
    });
  }

  // Subscription creep - 3+ recurring in same category
  for (const [cat, amount] of Object.entries(catTotals)) {
    const catExpenses = expenses.filter(
      (e) => e.category === cat && e.isRecurring,
    );
    if (catExpenses.length >= 3) {
      const catTotal = catExpenses.reduce((s, e) => s + e.amount, 0);
      insights.push({
        type: "info",
        text: `${catExpenses.length} subscriptions detected in ${cat} totaling ${formatAmount(catTotal)}/month`,
      });
    }
  }

  // Budget warning
  if (monthlyBudget > 0) {
    const pct = (total / monthlyBudget) * 100;
    if (pct >= 100) {
      insights.push({
        type: "danger",
        text: `Budget exceeded! You've spent ${pct.toFixed(0)}% of your monthly budget`,
      });
    } else if (pct >= 80) {
      insights.push({
        type: "warning",
        text: `${pct.toFixed(0)}% of monthly budget used — slow down to stay on track`,
      });
    }
  }

  return insights;
}

// Financial health indicator
export function getFinancialHealth(
  savingsRate,
  catTotals,
  total,
  monthlyTrend,
) {
  const anyCategoryOver40 = Object.values(catTotals).some(
    (v) => total > 0 && (v / total) * 100 > 40,
  );
  const increasing3Months =
    monthlyTrend.length >= 3 &&
    monthlyTrend.slice(-3).every((v, i, arr) => i === 0 || v > arr[i - 1]);

  if (savingsRate > 30 && !anyCategoryOver40 && !increasing3Months) {
    return {
      level: "healthy",
      color: "#22c55e",
      emoji: "🟢",
      text: "Healthy — great savings rate and balanced spending",
    };
  }
  if (savingsRate < 15 || increasing3Months) {
    return {
      level: "alert",
      color: "#ef4444",
      emoji: "🔴",
      text: "Alert — savings rate is low or spending is climbing",
    };
  }
  return {
    level: "watch",
    color: "#f59e0b",
    emoji: "🟡",
    text: "Watch — room for improvement in savings or category balance",
  };
}

// Get monthly totals for last N months
export async function getMonthlyTotals(contextId, months = 6) {
  const results = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = subMonths(now, i);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const expenses = await getExpensesForRange(contextId, start, end);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    results.push({
      month: format(date, "MMM yyyy"),
      monthShort: format(date, "MMM"),
      total,
      expenses,
    });
  }
  return results;
}
