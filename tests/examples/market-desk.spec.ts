import { expect, test } from "@playwright/test";

test("server markup contains the watchlist, order book, and chart without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Market desk" })).toBeVisible();
  await expect(page.locator('tbody tr[data-row-id="AXIF"]')).toBeVisible();
  await expect(page.locator('tbody tr[data-row-id="bid-0"]')).toBeVisible();
  await expect(page.getByRole("figure", { name: /AXIF price/ })).toBeVisible();
  await context.close();
});

test("order book cells update in place under the tick storm", async ({ page }) => {
  await page.goto("/");
  const level = page.locator('tbody tr[data-row-id="bid-0"]');
  await expect(level).toBeVisible();
  // Server markup is static; a changing cell proves hydration so the switch has its handler.
  const initial = await level.locator("td").nth(2).innerText();
  await expect.poll(() => level.locator("td").nth(2).innerText()).not.toBe(initial);
  const storm = page.getByRole("switch", { name: "Tick storm" });
  await storm.focus();
  await page.keyboard.press("Space");
  await expect(storm).toBeChecked();
  await expect(page.getByTestId("feed-mode")).toContainText("Tick storm");
  await level.evaluate(element => { Reflect.set(window, "__level", element); Reflect.set(window, "__cell", element.querySelector("td:nth-child(3)")); });
  const sizes = new Set<string>();
  for (let sample = 0; sample < 12 && sizes.size < 3; sample++) {
    sizes.add(await level.locator("td").nth(2).innerText());
    await page.waitForTimeout(120);
  }
  expect(sizes.size).toBeGreaterThan(1);
  expect(await level.evaluate(element => Reflect.get(window, "__level") === element && Reflect.get(window, "__cell") === element.querySelector("td:nth-child(3)"))).toBe(true);
});

test("ticking order book sizes flash their direction, and reduced motion suppresses it", async ({ page }) => {
  const flashes = (): Promise<number> => page.locator('tbody tr[data-row-id="bid-0"] td').nth(2).evaluate(cell => new Promise<number>(resolve => {
    let seen = 0;
    const observe = (): void => { seen += cell.getAnimations().filter(animation => animation.id === "sheen-change-flash").length; };
    const timer = window.setInterval(observe, 50);
    window.setTimeout(() => { window.clearInterval(timer); resolve(seen); }, 1500);
  }));
  await page.goto("/");
  await expect(page.locator('tbody tr[data-row-id="bid-0"]')).toBeVisible();
  expect(await flashes()).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Let flashes started before the preference change finish.
  await page.waitForTimeout(1200);
  expect(await flashes()).toBe(0);
});

test("submitting an order from the drawer reaches the blotter and notifies", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New order" }).click();
  const drawer = page.getByRole("dialog", { name: /New order/ });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("spinbutton", { name: "Quantity" }).fill("300");
  await drawer.getByRole("button", { name: /^Buy / }).click();
  await expect(drawer).toBeHidden();
  const blotter = page.getByRole("region", { name: "Blotter" });
  await expect(blotter.locator("tbody tr[data-row-id]")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Order notifications" }).getByText(/Bought \d+ AXIF|Order rejected|working/).first()).toBeVisible({ timeout: 8_000 });
});

test("analysis route renders a server placeholder without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/analysis");
  const region = page.getByRole("region", { name: "Order flow analysis" });
  await expect(region.getByRole("heading", { level: 2, name: "Order flow analysis" })).toBeVisible();
  await expect(region).toContainText("240 simulated desk orders");
  await expect(region.getByRole("figure", { name: "Fills by instrument and side" })).toBeVisible();
  await expect(region.getByRole("figure", { name: "Marked notional by venue and side" })).toBeVisible();
  await expect(region.getByRole("status")).toHaveText("Loading the Perspective engine…");
  await expect(page.locator("perspective-viewer")).toHaveCount(0);
  await context.close();
});

test("analysis streams order flow into Perspective, follows the color mode, and tears down on navigation", async ({ page }) => {
  const errors: Error[] = [];
  page.on("pageerror", error => errors.push(error));
  const workers: { closed: boolean }[] = [];
  page.on("worker", worker => { const entry = { closed: false }; workers.push(entry); worker.on("close", () => { entry.closed = true; }); });

  await page.goto("/analysis");
  await expect(page.getByRole("heading", { level: 2, name: "Order flow analysis" })).toBeVisible();
  const rows = page.getByTestId("analysis-pivot").locator("perspective-viewer regular-table tbody tr");
  await expect(rows.first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("analysis-status")).toHaveText("");
  await expect(page.getByTestId("analysis-chart").locator("perspective-viewer")).toHaveCount(1);

  // Grand totals change as the book clock streams table.update() calls.
  const totals = rows.first();
  const initial = await totals.innerText();
  await expect.poll(() => totals.innerText(), { timeout: 5_000 }).not.toBe(initial);

  const viewer = page.getByTestId("analysis-pivot").locator("perspective-viewer");
  const background = () => viewer.evaluate(element => getComputedStyle(element).getPropertyValue("--psp--background-color").trim());
  const dark = await background();
  expect(dark).not.toBe("");
  await page.getByRole("button", { name: /^Display/ }).click();
  await page.getByRole("button", { name: /Color mode/ }).click();
  await page.getByRole("option", { name: "Light" }).click();
  await expect.poll(background).not.toBe(dark);

  await page.getByRole("navigation", { name: "Desk views" }).getByRole("link", { name: "Desk" }).click();
  await expect(page.locator('tbody tr[data-row-id="bid-0"]')).toBeVisible();
  await expect(page.locator("perspective-viewer")).toHaveCount(0);
  // The engine worker is terminated with its client; the chart plugin keeps one page-level render worker.
  await expect.poll(() => workers.filter(worker => worker.closed).length).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
