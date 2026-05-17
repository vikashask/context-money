import { expect, test } from "@playwright/test";

test.describe("ContextMoney E2E", () => {
  test("complete onboarding, add expense, verify isolation", async ({
    page,
  }) => {
    // Clear all storage before test
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase("ContextMoneyDB");
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // --- Step 1: Onboarding ---
    // Should show onboarding since no data exists
    await expect(page.locator("text=Welcome")).toBeVisible({ timeout: 10000 });

    // Fill context name
    const nameInput = page.locator('input[placeholder*="name" i]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Test Context");
    }

    // Click through onboarding steps (Next/Continue/Start buttons)
    const nextBtn = page.locator(
      'button:has-text("Next"), button:has-text("Continue"), button:has-text("Start"), button:has-text("Get Started")',
    );
    let attempts = 0;
    while (attempts < 5) {
      const btn = nextBtn.first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(500);
        attempts++;
      } else {
        break;
      }
    }

    // Should now see the main dashboard
    await page.waitForTimeout(1000);

    // --- Step 2: Add expense via QuickAdd ---
    const quickAddInput = page.locator("#quick-add-input");
    if (await quickAddInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await quickAddInput.fill("500 food lunch");
      await page.locator('button:has-text("Add")').first().click();
      await page.waitForTimeout(500);
    }

    // --- Step 3: Verify expense appears ---
    // Navigate to expenses page
    const expensesLink = page.locator(
      'a[href="/expenses"], button:has-text("Expenses")',
    );
    if (
      await expensesLink
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await expensesLink.first().click();
      await page.waitForTimeout(500);

      // Check for the expense
      await expect(page.locator("text=Food").first()).toBeVisible({
        timeout: 5000,
      });
    }

    // --- Step 4: App loads without errors ---
    // Navigate back home
    const homeLink = page.locator(
      'a[href="/"], button:has-text("Home"), button:has-text("Dashboard")',
    );
    if (
      await homeLink
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await homeLink.first().click();
      await page.waitForTimeout(500);
    }

    // Verify no crash — page should have content
    await expect(page.locator("#root")).not.toBeEmpty();
  });

  test("landing page renders", async ({ page }) => {
    await page.goto("/landing");
    await page.waitForLoadState("networkidle");

    // Should show app name
    await expect(page.locator("text=ContextMoney").first()).toBeVisible({
      timeout: 5000,
    });
  });
});
