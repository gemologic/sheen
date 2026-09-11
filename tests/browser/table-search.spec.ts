import { expect, test } from "@playwright/test";

test("composed filters, sorting, facets, and pagination use the complete accepted view", async ({ page }) => {
  await page.goto("/table-search");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const rows = page.getByRole("table", { name: "Search results" }).locator("tbody tr");
  const count = page.getByRole("status", { name: "Search evaluations" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.getByRole("button", { name: "Only open", exact: true }).click();
  await expect(count).toHaveText("1");
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole("status", { name: "Status facets" })).toHaveText("open: 2, closed: 1");
  await page.getByRole("button", { name: "Sort descending", exact: true }).click();
  await expect(count).toHaveText("2");
  await expect(rows.first()).toHaveAttribute("data-row-id", "c");
  await page.getByRole("button", { name: "Paginate", exact: true }).click();
  await expect(count).toHaveText("3");
  await expect(rows).toHaveCount(1);
  const pagination = page.getByRole("navigation", { name: "Pagination", exact: true });
  await expect(pagination).toContainText("Page 1 of 2");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(count).toHaveText("4");
  await expect(rows.first()).toHaveAttribute("data-row-id", "a");
  await expect(pagination).toContainText("Page 2 of 2");
  await page.getByRole("button", { name: "Only open", exact: true }).click();
  await expect(count).toHaveText("5");
  await expect(pagination).toContainText("Page 1 of 3");
  await expect(rows.first()).toHaveAttribute("data-row-id", "c");
  await page.getByRole("searchbox", { name: "Search rows" }).fill("alpha");
  await expect(count).toHaveText("6");
  await expect(pagination).toContainText("Page 1 of 2");
  await expect(rows.first()).toHaveAttribute("data-row-id", "b");
  await expect(page.getByRole("status", { name: "Matching total" })).toHaveText("2");
  await expect(page.getByRole("status", { name: "Status facets" })).toHaveText("open: 1, closed: 1");
  await page.getByRole("button", { name: "Paginate", exact: true }).click();
  await expect(count).toHaveText("7");
  await expect(pagination).toHaveCount(0);
  await expect(rows).toHaveCount(2);
  expect(errors).toEqual([]);
});

test("same-query debounce preserves rows and focused drafts through intermediate frames", async ({ page }) => {
  await page.goto("/table-search");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const table = page.getByRole("table", { name: "Search results" });
  const draft = page.getByRole("textbox", { name: "Draft a", exact: true });
  await draft.fill("Unsaved edit");
  await draft.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected input");
    element.setSelectionRange(2, 7);
    element.dataset.retained = "true";
    const table = element.closest("table");
    if (!table) throw new Error("Expected table");
    let samples = 0;
    let failures = 0;
    const sample = () => {
      if (!table.isConnected) return;
      samples++;
      if (table.querySelectorAll("tbody tr").length !== 3 || !element.isConnected || document.activeElement !== element || element.selectionStart !== 2 || element.selectionEnd !== 7) failures++;
      table.dataset.samples = String(samples);
      table.dataset.failures = String(failures);
      if (!table.hasAttribute("data-stop")) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await draft.press("Alt+r");
  await expect(page.getByRole("status", { name: "Search evaluations" })).toHaveText("1");
  await expect(page.getByRole("status", { name: "Search activity" })).toHaveText("Settled");
  await expect(draft).toHaveValue("Unsaved edit");
  await expect(draft).toHaveAttribute("data-retained", "true");
  await expect(draft).toBeFocused();
  await table.evaluate(element => element.setAttribute("data-stop", "true"));
  expect(Number(await table.getAttribute("data-samples"))).toBeGreaterThan(1);
  await expect(table).toHaveAttribute("data-failures", "0");
});

test("rapid native input events evaluate only the final query and label retained rows", async ({ page }) => {
  await page.goto("/table-search");
  await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
  const search = page.getByRole("searchbox", { name: "Search rows" });
  await search.evaluate(element => {
    if (!(element instanceof HTMLInputElement)) throw new Error("Expected search input");
    for (const value of ["b", "bet", "alpha"]) { element.value = value; element.dispatchEvent(new Event("input", { bubbles: true })); }
    const table = document.querySelector('table[aria-label="Search results"]');
    if (table?.querySelectorAll("tbody tr").length !== 3) throw new Error("Pending rows were replaced");
    const archive = [...document.querySelectorAll("button")].find(button => button.textContent === "Archive c");
    if (!archive?.disabled) throw new Error("Previous-query action remained enabled");
  });
  await expect(page.getByRole("status", { name: "Search evaluations" })).toHaveText("1");
  await expect(page.getByRole("status", { name: "Result query" })).toHaveText("Accepted: alpha");
  await expect(page.getByRole("table", { name: "Search results" }).locator("tbody tr")).toHaveCount(2);
  await search.fill("beta");
  await page.getByRole("button", { name: "Clear accepted results" }).click();
  await expect(page.getByRole("table", { name: "Search results" }).locator("tbody tr")).toHaveCount(0);
});

test("initial results hydrate without evaluation or loss of a pre-hydration draft", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/table-search", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Draft a", exact: true });
    await draft.fill("Before hydration");
    await draft.evaluate(element => element.setAttribute("data-server", "true"));
    release();
    await expect(page.getByRole("status", { name: "Hydration state" })).toHaveText("Ready");
    await expect(draft).toHaveValue("Before hydration");
    await expect(draft).toHaveAttribute("data-server", "true");
    await expect(draft).toBeFocused();
    await expect(page.getByRole("status", { name: "Search evaluations" })).toHaveText("0");
    expect(errors).toEqual([]);
  } finally { release(); }
});
