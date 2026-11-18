import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

const ready = (page: Page) => expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
const tasks = (page: Page) => page.getByRole("list", { name: "Release tasks" });
const taskItem = (page: Page, id: string) => tasks(page).locator(`[data-sortable-id="${id}"]`);
const card = (page: Page, id: string) => page.locator(`.sheen-board-card[data-card-id="${id}"]`);
const column = (page: Page, id: string) => page.locator(`.sheen-board-column[data-column-id="${id}"]`);
const announcer = (scope: Locator) => scope.locator('[role="status"]');

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Drag geometry is unavailable");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A point just inside one edge of the element's current box, read after any scrolling the drag source caused. */
async function near(locator: Locator, edge: "start" | "end" | "inline-start"): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Drop target geometry is unavailable");
  if (edge === "inline-start") return { x: box.x + 8, y: box.y + 40 };
  return { x: box.x + box.width / 2, y: edge === "start" ? box.y + 4 : box.y + box.height - 4 };
}

/** A real pointer drag: press, move past the drag threshold, travel in steps, release. */
async function drag(page: Page, source: Locator, destination: () => Promise<{ x: number; y: number }>, inspect?: () => Promise<void>): Promise<void> {
  const from = await center(source);
  const to = await destination();
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  // Chromium reports dragover a few moves behind the pointer; nudging in place lets the target observe the final point.
  for (const offset of [1, 0, 1, 0]) await page.mouse.move(to.x + offset, to.y);
  await inspect?.();
  await page.mouse.up();
}

test("server markup renders every list item, board column, card, count, and empty drop zone without script", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto("/sortable");
    await expect(tasks(page).getByRole("listitem")).toHaveCount(5);
    await expect(tasks(page)).toContainText("Draft release notes");
    await expect(page.getByRole("list", { name: "Long queue" }).getByRole("listitem")).toHaveCount(40);
    await expect(page.locator(".sheen-board-column")).toHaveCount(4);
    await expect(page.locator(".sheen-board-card")).toHaveCount(6);
    await expect(column(page, "backlog").locator(".sheen-board-column-count")).toHaveText("3");
    await expect(column(page, "review").locator(".sheen-board-empty")).toHaveText("No cards");
    await expect(page.getByRole("button", { name: "Reorder column Backlog" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Reorder Alpha" })).toHaveCount(1);
  } finally { await context.close(); }
});

test("keyboard lifts, moves, drops, and cancels with announcements while focus stays on the moving item", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const order = page.getByLabel("Task order");
  const root = page.locator(".sheen-sortable").filter({ has: tasks(page) });
  const first = taskItem(page, "t1");
  await first.focus();
  await page.keyboard.press("Space");
  await expect(first).toHaveAttribute("data-lifted", "");
  await expect(announcer(root)).toHaveText("Picked up Draft release notes. Position 1 of 5.");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(announcer(root)).toHaveText("Draft release notes, position 3 of 5.");
  await expect(first).toBeFocused();
  await expect(order).toHaveText("t1,t2,t3,t4,t5");
  await page.keyboard.press("Enter");
  await expect(order).toHaveText("t2,t3,t1,t4,t5");
  await expect(announcer(root)).toHaveText("Dropped Draft release notes at position 3 of 5.");
  await expect(first).toBeFocused();
  await expect(first).not.toHaveAttribute("data-lifted");

  await page.keyboard.press("Space");
  await page.keyboard.press("End");
  await expect(tasks(page).getByRole("listitem").last()).toHaveAttribute("data-sortable-id", "t1");
  await page.keyboard.press("Escape");
  await expect(announcer(root)).toHaveText("Reorder cancelled. Draft release notes returned to position 3 of 5.");
  await expect(tasks(page).getByRole("listitem").nth(2)).toHaveAttribute("data-sortable-id", "t1");
  await expect(order).toHaveText("t2,t3,t1,t4,t5");
  await expect(first).toBeFocused();

  const locked = taskItem(page, "t3");
  await expect(locked).toHaveAttribute("aria-disabled", "true");
  await expect(locked).not.toHaveAttribute("tabindex");
  await page.keyboard.press("Space");
  await page.keyboard.press("Tab");
  await expect(first).not.toHaveAttribute("data-lifted");
  await expect(order).toHaveText("t2,t3,t1,t4,t5");
});

test("handles own keyboard reordering on a horizontal list, and arrows follow reading direction in RTL", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const handle = page.getByRole("button", { name: "Reorder Alpha" });
  await handle.focus();
  await page.keyboard.press("Enter");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Chip order")).toHaveText("h2,h3,h1,h4");
  await expect(handle).toBeFocused();

  const rtl = page.getByRole("list", { name: "RTL chips" }).locator('[data-sortable-id="r1"]');
  await rtl.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Space");
  await expect(page.getByLabel("RTL order")).toHaveText("r2,r1,r3");
});

test("pointer drags reorder with an accent drop indicator, and the dragged source is dimmed", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const target = taskItem(page, "t1");
  await drag(page, taskItem(page, "t5"), () => near(target, "start"), async () => {
    await expect(target).toHaveAttribute("data-drop-edge", "before");
    await expect(taskItem(page, "t5")).toHaveAttribute("data-dragging", "");
  });
  await expect(page.getByLabel("Task order")).toHaveText("t5,t1,t2,t3,t4");
  await expect(target).not.toHaveAttribute("data-drop-edge");

  // Disabled items do not start a drag.
  await drag(page, taskItem(page, "t3"), () => center(taskItem(page, "t5")));
  await expect(page.getByLabel("Task order")).toHaveText("t5,t1,t2,t3,t4");
});

test("pointer drags auto-scroll the containing scroller and drop beyond the initial viewport", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const scroller = page.getByTestId("sortable-scroller");
  await scroller.scrollIntoViewIfNeeded();
  const box = await scroller.boundingBox();
  if (!box) throw new Error("Scroller geometry is unavailable");
  const source = page.getByRole("button", { name: "Reorder Queue item 1", exact: true });
  const from = await center(source);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 6, from.y + 6, { steps: 4 });
  await page.mouse.move(from.x, box.y + box.height - 4, { steps: 12 });
  await expect.poll(() => scroller.evaluate(element => element.scrollTop), { timeout: 10_000 }).toBeGreaterThan(400);
  await page.mouse.move(from.x, box.y + box.height - 40, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel("Queue order")).not.toHaveText(/^l1,/u);
});

test("board cards move by keyboard within and across columns, including an empty column", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const board = page.getByRole("group", { name: "Sprint board" });
  const layout = page.getByLabel("Board layout");
  await card(page, "c1").focus();
  await page.keyboard.press("Space");
  await expect(announcer(board)).toHaveText("Picked up Audit log export in Backlog. Position 1 of 3.");
  await page.keyboard.press("ArrowRight");
  await expect(announcer(board)).toHaveText("Audit log export, In progress, position 1 of 3.");
  await expect(card(page, "c1")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(announcer(board)).toHaveText("Audit log export, Review, position 1 of 1.");
  await expect(column(page, "review").locator(".sheen-board-empty")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(layout).toHaveText("backlog:c2,c3 doing:c4,c5 review:c1 done:c6");
  await expect(page.getByLabel("Last move")).toHaveText(JSON.stringify({ id: "c1", fromColumn: "backlog", fromIndex: 0, toColumn: "review", index: 0 }));
  await expect(card(page, "c1")).toBeFocused();
  await expect(column(page, "review").locator(".sheen-board-column-count")).toHaveText("1");

  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("End");
  await page.keyboard.press("Escape");
  await expect(layout).toHaveText("backlog:c2,c3 doing:c4,c5 review:c1 done:c6");
  await expect(announcer(board)).toHaveText("Move cancelled. Audit log export returned to Review, position 1 of 1.");

  await expect(card(page, "c5")).toHaveAttribute("aria-disabled", "true");
  const columnHandle = page.getByRole("button", { name: "Reorder column Done" });
  await columnHandle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("Home");
  await page.keyboard.press("Space");
  await expect(layout).toHaveText("done:c6 backlog:c2,c3 doing:c4,c5 review:c1");
  await expect(columnHandle).toBeFocused();
});

test("board pointer drags move cards between columns, into empty columns, and reorder columns", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const layout = page.getByLabel("Board layout");
  const review = column(page, "review");
  await drag(page, card(page, "c6"), () => center(review.locator(".sheen-board-empty")), async () => {
    await expect(review).toHaveAttribute("data-drop-target", "");
  });
  await expect(layout).toHaveText("backlog:c1,c2,c3 doing:c4,c5 review:c6 done:");
  await expect(page.getByLabel("Last move")).toHaveText(JSON.stringify({ id: "c6", fromColumn: "done", fromIndex: 0, toColumn: "review", index: 0 }));

  const target = card(page, "c4");
  await drag(page, card(page, "c2"), () => near(target, "end"), async () => {
    await expect(target).toHaveAttribute("data-drop-edge", "after");
  });
  await expect(layout).toHaveText("backlog:c1,c3 doing:c4,c2,c5 review:c6 done:");

  const backlog = column(page, "backlog");
  await drag(page, page.getByRole("button", { name: "Reorder column Done" }), () => near(backlog, "inline-start"), async () => {
    await expect(backlog).toHaveAttribute("data-drop-edge", "before");
  });
  await expect(layout).toHaveText("done: backlog:c1,c3 doing:c4,c2,c5 review:c6");
});

test("refresh keeps item DOM identity, focus, and an in-progress keyboard lift", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const item = taskItem(page, "t2");
  const boardCard = card(page, "c4");
  await item.evaluate(element => { element.dataset.identity = "retained"; });
  await boardCard.evaluate(element => { element.dataset.identity = "retained"; });
  await item.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  const frames = await page.evaluate(async () => {
    const node = document.querySelector('[data-sortable-id="t2"]');
    const button = [...document.querySelectorAll("button")].find(element => element.textContent === "Refresh data");
    const seen: string[] = [];
    const observer = new MutationObserver(() => { seen.push(`${node?.isConnected ? "connected" : "detached"}:${document.querySelectorAll(".sheen-skeleton").length}`); });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    observer.disconnect();
    return seen;
  });
  expect(frames.length).toBeGreaterThan(0);
  expect(frames.every(frame => frame === "connected:0")).toBe(true);
  await expect(item).toHaveAttribute("data-identity", "retained");
  await expect(boardCard).toHaveAttribute("data-identity", "retained");
  await expect(item).toContainText("r1");
  await expect(item).toHaveAttribute("data-lifted", "");
  await expect(tasks(page).getByRole("listitem").nth(2)).toHaveAttribute("data-sortable-id", "t2");
  await item.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Task order")).toHaveText("t1,t3,t2,t4,t5");
});

test("sortable fixture passes axe", async ({ page }) => {
  await page.goto("/sortable");
  await ready(page);
  const results = await new AxeBuilder({ page }).include(".sheen-sortable").include(".sheen-board").analyze();
  expect(results.violations).toEqual([]);
});

test("sortable visuals: desktop list and board, keyboard lift elevation, and phone board", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/sortable");
  await ready(page);
  await page.evaluate(() => document.fonts.ready);
  const vertical = page.locator("section").filter({ has: tasks(page) });
  await taskItem(page, "t2").focus();
  await page.keyboard.press("Space");
  await expect(vertical).toHaveScreenshot("sortable-list-lifted.png");
  await page.keyboard.press("Escape");
  const board = page.getByRole("group", { name: "Sprint board" });
  await expect(board).toHaveScreenshot("sortable-board-desktop.png");
  await page.setViewportSize({ width: 375, height: 812 });
  await board.scrollIntoViewIfNeeded();
  await expect(board).toHaveScreenshot("sortable-board-phone.png");
});
