import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

// Mock dependencies before importing components
vi.mock("../db", () => ({
  db: {
    categories: {
      toArray: () =>
        Promise.resolve([
          { id: 1, name: "Food", icon: "🍕", keywords: ["food", "lunch"] },
          { id: 2, name: "Transport", icon: "🚗", keywords: ["uber", "auto"] },
        ]),
    },
    expenses: {
      add: vi.fn().mockResolvedValue(1),
      where: () => ({
        equals: () => ({
          filter: () => ({ toArray: () => Promise.resolve([]) }),
        }),
      }),
    },
    contexts: {
      get: () =>
        Promise.resolve({ id: 1, monthlyBudget: 50000, monthlyIncome: 80000 }),
    },
  },
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (fn) => {
    // Return mock data synchronously
    try {
      const result = fn();
      if (result?.then) return undefined; // Async — return undefined initially
      return result;
    } catch {
      return undefined;
    }
  },
}));

vi.mock("../store", () => ({
  useStore: () => ({
    activeContextId: 1,
    currency: "INR",
  }),
  getCurrencySymbol: () => "₹",
}));

vi.mock("../components/Toast", () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Now import
import QuickAdd from "../components/QuickAdd";

describe("QuickAdd Component", () => {
  it("renders input and button", () => {
    render(<QuickAdd />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
  });

  it("accepts text input", async () => {
    const user = userEvent.setup();
    render(<QuickAdd />);
    const input = screen.getByRole("textbox");
    await user.type(input, "500 food");
    expect(input).toHaveValue("500 food");
  });

  it("has placeholder text", () => {
    render(<QuickAdd />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder");
  });
});
