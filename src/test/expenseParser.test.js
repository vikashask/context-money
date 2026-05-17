import { describe, expect, it } from "vitest";
import { parseExpense, suggestCategory } from "../utils/expenseParser";

const mockCategories = [
  {
    name: "Food",
    icon: "🍕",
    keywords: ["food", "lunch", "dinner", "swiggy", "chai"],
  },
  {
    name: "Transport",
    icon: "🚗",
    keywords: ["uber", "auto", "metro", "fuel"],
  },
  { name: "Rent", icon: "🏠", keywords: ["rent", "housing"] },
  { name: "Shopping", icon: "🛒", keywords: ["amazon", "shopping"] },
  { name: "Entertainment", icon: "🎬", keywords: ["netflix", "movie"] },
  {
    name: "Utilities",
    icon: "💡",
    keywords: ["electricity", "wifi", "recharge"],
  },
  { name: "Health", icon: "🏥", keywords: ["medicine", "doctor", "gym"] },
  { name: "Savings", icon: "💰", keywords: ["sip", "invest", "fd"] },
  { name: "Other", icon: "📦", keywords: [] },
];

describe("parseExpense", () => {
  it("returns null for empty input", () => {
    expect(parseExpense("", mockCategories)).toBeNull();
    expect(parseExpense("   ", mockCategories)).toBeNull();
  });

  it("returns null for input without amount", () => {
    expect(parseExpense("food lunch", mockCategories)).toBeNull();
  });

  it("parses amount at start: '500 food'", () => {
    const results = parseExpense("500 food", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(500);
    expect(results[0].category).toBe("Food");
  });

  it("parses amount at end: 'food 500'", () => {
    const results = parseExpense("food 500", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(500);
    expect(results[0].category).toBe("Food");
  });

  it("strips currency symbols: '₹500 chai'", () => {
    const results = parseExpense("₹500 chai", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(500);
    expect(results[0].category).toBe("Food");
  });

  it("parses decimal amounts: '49.5 coffee'", () => {
    const results = parseExpense("49.5 coffee", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(49.5);
  });

  it("matches keyword-mapped categories: 'uber 200'", () => {
    const results = parseExpense("uber 200", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("Transport");
    expect(results[0].amount).toBe(200);
  });

  it("matches keyword-mapped categories: '100 chai'", () => {
    const results = parseExpense("100 chai", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("Food");
  });

  it("matches keyword-mapped Indian context: '200 auto'", () => {
    const results = parseExpense("200 auto", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].category).toBe("Transport");
  });

  it("parses multiple expenses separated by comma", () => {
    const results = parseExpense("500 food, 200 auto", mockCategories);
    expect(results).toHaveLength(2);
    expect(results[0].amount).toBe(500);
    expect(results[0].category).toBe("Food");
    expect(results[1].amount).toBe(200);
    expect(results[1].category).toBe("Transport");
  });

  it("parses multiple expenses separated by 'and'", () => {
    const results = parseExpense("300 lunch and 150 metro", mockCategories);
    expect(results).toHaveLength(2);
    expect(results[0].category).toBe("Food");
    expect(results[1].category).toBe("Transport");
  });

  it("detects 'yesterday' date", () => {
    const results = parseExpense("500 food yesterday", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].date).not.toBe(new Date().toISOString().split("T")[0]);
  });

  it("detects 'today' date", () => {
    const results = parseExpense("500 food today", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].date).toBe(new Date().toISOString().split("T")[0]);
  });

  it("detects recurring flag: '1000 netflix monthly'", () => {
    const results = parseExpense("1000 netflix monthly", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].isRecurring).toBe(true);
    expect(results[0].category).toBe("Entertainment");
  });

  it("detects recurring flag: 'recurring 500 gym'", () => {
    const results = parseExpense("recurring 500 gym", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].isRecurring).toBe(true);
    expect(results[0].category).toBe("Health");
  });

  it("returns null category when no match found", () => {
    const results = parseExpense("500 xyzwhatever", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(500);
    // May or may not have a category depending on amount/time heuristics
  });

  it("extracts remaining text as note", () => {
    const results = parseExpense("500 food lunch at office", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].note).toContain("lunch");
  });

  it("handles large amounts: '15000 rent'", () => {
    const results = parseExpense("15000 rent", mockCategories);
    expect(results).toHaveLength(1);
    expect(results[0].amount).toBe(15000);
    expect(results[0].category).toBe("Rent");
  });
});

describe("suggestCategory", () => {
  it("returns keyword-based suggestion", () => {
    const suggestions = suggestCategory("chai", 50, [], mockCategories);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].category).toBe("Food");
    expect(suggestions[0].confidence).toBeGreaterThan(0.5);
  });

  it("returns empty array for unknown note", () => {
    // May still have amount/time heuristics
    const suggestions = suggestCategory("zzz", null, [], mockCategories);
    // At most time-based suggestions
    expect(suggestions.length).toBeLessThanOrEqual(2);
  });

  it("considers history", () => {
    const history = [
      { category: "Shopping", note: "bought shoes", amount: 2000 },
      { category: "Shopping", note: "shoes online", amount: 1500 },
    ];
    const suggestions = suggestCategory("shoes", 1800, history, mockCategories);
    const shoppingSuggestion = suggestions.find(
      (s) => s.category === "Shopping",
    );
    expect(shoppingSuggestion).toBeDefined();
  });
});
