import { describe, expect, it } from "vitest";
import {
  formatAmount,
  generateInsights,
  getCategoryTotals,
  getFinancialHealth,
} from "../utils";

describe("formatAmount", () => {
  it("formats with default INR symbol", () => {
    expect(formatAmount(1000, "₹")).toBe("₹1,000");
  });

  it("formats large numbers with commas", () => {
    expect(formatAmount(100000, "₹")).toContain("1,00,000");
  });

  it("formats with dollar symbol", () => {
    expect(formatAmount(500, "$")).toContain("$");
    expect(formatAmount(500, "$")).toContain("500");
  });

  it("handles zero", () => {
    expect(formatAmount(0, "₹")).toBe("₹0");
  });

  it("rounds decimals", () => {
    const result = formatAmount(99.7, "₹");
    expect(result).toContain("100");
  });
});

describe("getCategoryTotals", () => {
  it("returns empty object for no expenses", () => {
    expect(getCategoryTotals([])).toEqual({});
  });

  it("sums amounts by category", () => {
    const expenses = [
      { category: "Food", amount: 200 },
      { category: "Transport", amount: 100 },
      { category: "Food", amount: 300 },
    ];
    const totals = getCategoryTotals(expenses);
    expect(totals.Food).toBe(500);
    expect(totals.Transport).toBe(100);
  });

  it("handles single expense", () => {
    const totals = getCategoryTotals([{ category: "Rent", amount: 15000 }]);
    expect(totals.Rent).toBe(15000);
  });
});

describe("generateInsights", () => {
  it("returns empty for no data", () => {
    const insights = generateInsights([], 0, 0, [], []);
    expect(insights).toEqual([]);
  });

  it("warns when budget exceeded", () => {
    const expenses = [
      {
        category: "Food",
        amount: 6000,
        date: "2026-05-01",
        isRecurring: false,
      },
    ];
    const insights = generateInsights(expenses, 5000, 50000, [], []);
    const budgetInsight = insights.find((i) => i.type === "danger");
    expect(budgetInsight).toBeDefined();
    expect(budgetInsight.text).toContain("exceeded");
  });

  it("warns at 80% budget usage", () => {
    const expenses = [
      {
        category: "Food",
        amount: 4200,
        date: "2026-05-01",
        isRecurring: false,
      },
    ];
    const insights = generateInsights(expenses, 5000, 50000, [], []);
    const budgetInsight = insights.find((i) => i.text.includes("budget"));
    expect(budgetInsight).toBeDefined();
  });

  it("detects category over 40%", () => {
    const expenses = [
      {
        category: "Food",
        amount: 5000,
        date: "2026-05-01",
        isRecurring: false,
      },
      {
        category: "Transport",
        amount: 1000,
        date: "2026-05-02",
        isRecurring: false,
      },
    ];
    const insights = generateInsights(expenses, 10000, 50000, [], []);
    const catInsight = insights.find((i) => i.text.includes("Food"));
    expect(catInsight).toBeDefined();
  });
});

describe("getFinancialHealth", () => {
  it("returns 'healthy' for high savings rate", () => {
    const health = getFinancialHealth(
      35,
      { Food: 3000, Transport: 4000 },
      10000,
      [10000, 10000, 10000],
    );
    expect(health.level).toBe("healthy");
  });

  it("returns 'alert' for negative savings", () => {
    const health = getFinancialHealth(
      -5,
      { Food: 5000 },
      10000,
      [10000, 11000, 12000],
    );
    expect(health.level).toBe("alert");
  });
});
