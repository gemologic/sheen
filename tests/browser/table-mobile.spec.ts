import { expect, test } from "@playwright/test";

test("phone cards bound continuous DOM and preserve selection, actions, activation, and paging", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-mobile");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const section = page.getByRole("region", { name: "Mobile card table" });
  const table = section.getByRole("table", { name: "Mobile accounts", includeHidden: true });
  await expect(table).toBeHidden();
  const list = section.getByRole("list", { name: "Mobile accounts, card view" });
  await expect(list).toBeVisible();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(list.locator('[data-mobile-row-id="mobile-0"]')).toBeVisible();
  await expect(list.locator('[data-mobile-row-id="mobile-10"]')).toHaveCount(0);
  expect(await section.locator(".sheen-data-table").evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);

  const first = list.locator('[data-mobile-row-id="mobile-0"]');
  await first.getByRole("checkbox", { name: "Select row mobile-0" }).press("Space");
  await expect(section.getByRole("status", { name: "Mobile selection result" })).toContainText('"mobile-0"');
  await first.getByRole("button", { name: "Actions for row mobile-0" }).click();
  await page.getByRole("menuitem", { name: "Archive" }).click();
  await expect(section.getByRole("status", { name: "Mobile action result" })).toHaveText("archive|anchor:mobile-0|selection:mobile-0");

  await first.focus();
  await first.press("Enter");
  await expect(section.getByRole("status", { name: "Mobile activation result" })).toHaveText("mobile-0");
  await section.getByRole("navigation", { name: "Mobile accounts, card view" }).getByRole("button", { name: "Next page" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(10);
  await expect(list.locator('[data-mobile-row-id="mobile-10"]')).toBeVisible();
  await expect(list.locator('[data-mobile-row-id="mobile-0"]')).toHaveCount(0);
  await section.getByRole("button", { name: "Sort", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sort by Name, not sorted" }).click();
  await expect(list.locator('[data-mobile-row-id="mobile-0"]')).toBeVisible();
});

test("phone server refresh keeps accepted cards opaque and stable until atomic acceptance", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-mobile");
  const section = page.getByRole("region", { name: "Mobile refreshing table" });
  const root = section.locator(".sheen-data-table");
  const mobile = section.locator(".sheen-data-table-mobile");
  const first = mobile.locator('[data-mobile-row-id="mobile-0"]');
  const firstHandle = await first.elementHandle();
  if (!firstHandle) throw new Error("Expected the first accepted mobile card");
  await first.evaluate(element => { Reflect.set(element, "__sheenMobileRefreshIdentity", "retained"); });
  await section.getByRole("button", { name: "Sort", exact: true }).click();
  await page.getByRole("menuitem", { name: "Sort by Name, ascending" }).click();
  await expect(root).toHaveAttribute("data-pending", "");
  const samples = await mobile.evaluate(async element => {
    const values: { readonly cards: number; readonly visible: number; readonly opacity: string }[] = [];
    for (let frame = 0; frame < 20; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const cards = [...element.querySelectorAll<HTMLElement>("[data-mobile-row-id]")];
      values.push({ cards: cards.length, visible: cards.filter(card => card.getClientRects().length > 0).length, opacity: getComputedStyle(cards[0] ?? element).opacity });
    }
    return values;
  });
  expect(samples.every(sample => sample.cards === 10 && sample.visible === 10 && sample.opacity === "1")).toBe(true);
  await expect(section.locator(".sheen-data-table-refresh")).toContainText("Refreshing, showing existing results");
  await expect(root).not.toHaveAttribute("data-pending", "");
  expect(await firstHandle.evaluate(element => Reflect.get(element, "__sheenMobileRefreshIdentity"))).toBe("retained");
  expect(await firstHandle.getAttribute("data-mobile-row-id")).toBe("mobile-9");
  await expect(mobile.locator('[data-mobile-row-id="mobile-9"]')).toBeVisible();
});

test("desktop keeps the virtualized table and hides the opt-in card presentation", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/table-mobile");
  const section = page.getByRole("region", { name: "Mobile card table" });
  await expect(section.getByRole("table", { name: "Mobile accounts" })).toBeVisible();
  await expect(section.locator(".sheen-data-table-mobile")).toBeHidden();
  expect(await section.locator("[data-mobile-row-id]").count()).toBe(10);
});

test("delayed hydration retains visible phone cards without a blank or duplicate presentation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/table-mobile", { waitUntil: "commit" });
    const section = page.getByRole("region", { name: "Mobile card table" });
    const mobile = section.locator(".sheen-data-table-mobile");
    const list = mobile.getByRole("list", { name: "Mobile accounts, card view" });
    const first = mobile.locator('[data-mobile-row-id="mobile-0"]');
    await expect(first).toBeVisible();
    await expect(section.getByRole("table", { name: "Mobile accounts", includeHidden: true })).toBeHidden();
    await mobile.evaluate(element => { Reflect.set(element, "__sheenMobileHydrationIdentity", "mobile"); });
    await list.evaluate(element => { Reflect.set(element, "__sheenMobileHydrationIdentity", "list"); });
    await first.evaluate(element => { Reflect.set(element, "__sheenMobileHydrationIdentity", "card"); });
    const samplesPromise = mobile.evaluate(async element => {
      const samples: { readonly cards: number; readonly visible: number }[] = [];
      for (let frame = 0; frame < 20; frame++) {
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const cards = [...element.querySelectorAll<HTMLElement>("[data-mobile-row-id]")];
        samples.push({ cards: cards.length, visible: cards.filter(card => card.getClientRects().length > 0).length });
      }
      return samples;
    });
    release();
    const samples = await samplesPromise;
    expect(samples.every(sample => sample.cards === 10 && sample.visible === 10)).toBe(true);
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    expect([
      await mobile.evaluate(element => Reflect.get(element, "__sheenMobileHydrationIdentity")),
      await list.evaluate(element => Reflect.get(element, "__sheenMobileHydrationIdentity")),
      await first.evaluate(element => Reflect.get(element, "__sheenMobileHydrationIdentity")),
    ]).toEqual(["mobile", "list", "card"]);
    await first.getByRole("button", { name: "Actions for row mobile-0" }).click();
    await expect(page.getByRole("menuitem", { name: "Archive" })).toHaveCount(1);
  } finally { release(); }
});

test("phone card styling has a bounded dark baseline", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Reviewed raster baselines are pinned to bundled Chromium; WebKit runs the functional phone-card cases above.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table-mobile");
  const first = page.locator('[data-mobile-row-id="mobile-0"]');
  await first.getByRole("checkbox", { name: "Select row mobile-0" }).press("Space");
  await expect(first).toHaveScreenshot("data-table-mobile-card-dark.png");
});
