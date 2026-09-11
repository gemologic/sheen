import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

interface CompositionCase {
  readonly path: string;
  readonly title: string;
  readonly draftLabel: string;
  readonly draft: string;
  readonly retainedText: string;
}

const compositions: readonly CompositionCase[] = [
  { path: "/gallery/list-detail", title: "Issue list and detail", draftLabel: "Retained issue title", draft: "Keep issue edit", retainedText: "Acceptance notes" },
  { path: "/gallery/settings", title: "Workspace settings", draftLabel: "Display name", draft: "Keep settings edit", retainedText: "Profile" },
  { path: "/gallery/form", title: "Provision workspace", draftLabel: "Work email", draft: "draft@example.com", retainedText: "Account details" },
  { path: "/gallery/reading", title: "Design-system notebook", draftLabel: "Retained margin note", draft: "Keep reading note", retainedText: "Continuity before novelty" },
];

async function ready(page: Page): Promise<void> {
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
}

async function sampleRetainedRefresh(content: Locator, input: Locator, expectedText: string): Promise<readonly boolean[]> {
  return content.evaluate(async (element, text) => {
    const field = element.querySelector("input");
    if (!(field instanceof HTMLInputElement)) throw new Error("Missing composition draft input");
    const frames: boolean[] = [];
    for (let index = 0; index < 20; index += 1) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const style = getComputedStyle(element);
      frames.push(element.isConnected
        && field.isConnected
        && document.activeElement === field
        && style.opacity === "1"
        && style.display !== "none"
        && style.visibility !== "hidden"
        && (element.textContent ?? "").includes(text)
        && !element.querySelector(".sheen-skeleton"));
    }
    return frames;
  }, expectedText).then(async frames => {
    await expect(input).toBeFocused();
    return frames;
  });
}

for (const composition of compositions) {
  test(`${composition.title} retains its accepted owner and draft through refresh`, async ({ page }) => {
    await page.goto(composition.path);
    await ready(page);
    const scenario = page.locator(`[data-gallery-scenario="${composition.path}"]`);
    const content = scenario.locator(`[data-gallery-content="${composition.path}"]`);
    const input = scenario.getByRole("textbox", { name: composition.draftLabel, exact: true });
    await expect(scenario.getByRole("heading", { name: composition.title, exact: true })).toBeVisible();
    await expect(content).toContainText(composition.retainedText);
    await content.evaluate(element => element.setAttribute("data-composition-identity", "retained"));
    await input.fill(composition.draft);
    await input.evaluate(element => element.setAttribute("data-draft-identity", "retained"));
    await scenario.getByRole("button", { name: "Refresh scenario", exact: true }).evaluate(element => {
      if (!(element instanceof HTMLButtonElement)) throw new Error("Missing refresh button");
      element.click();
    });
    await expect(content).toHaveAttribute("data-pending", "true");
    const frames = await sampleRetainedRefresh(content, input, composition.retainedText);
    expect(frames).toHaveLength(20);
    expect(frames.every(Boolean)).toBe(true);
    await expect(scenario.getByLabel("Scenario revision", { exact: true })).toHaveText("Revision 1");
    await expect(content).not.toHaveAttribute("data-pending", "");
    await expect(content).toHaveAttribute("data-composition-identity", "retained");
    await expect(input).toHaveAttribute("data-draft-identity", "retained");
    await expect(input).toHaveValue(composition.draft);
  });
}

test("gallery compositions expose their application-specific semantics", async ({ page }) => {
  await page.goto("/gallery/list-detail");
  await ready(page);
  await expect(page.getByRole("region", { name: "Issues", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Issue details", exact: true })).toBeVisible();

  await page.goto("/gallery/settings");
  await ready(page);
  await expect(page.getByRole("group", { name: "Workspace settings", exact: true })).toBeVisible();
  await page.getByRole("textbox", { name: "Display name", exact: true }).fill("Grace Hopper");
  await expect(page.getByRole("button", { name: "Save changes", exact: true })).toBeEnabled();

  await page.goto("/gallery/form");
  await ready(page);
  const form = page.getByRole("form", { name: "Provision workspace", exact: true });
  await form.getByRole("button", { name: "Create workspace", exact: true }).click();
  await expect(form.getByText("Enter a valid email address.", { exact: true })).toBeVisible();
  await expect(form.getByText("Acceptance is required.", { exact: true })).toBeVisible();

  await page.goto("/gallery/reading");
  await ready(page);
  await expect(page.getByRole("navigation", { name: "Notebook contents", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Interfaces that survive change", exact: true })).toBeVisible();
});

test("every application-shape gallery exposes a retained command-palette refresh", async ({ page }) => {
  for (const composition of compositions) {
    await page.goto(composition.path);
    await ready(page);
    const content = page.locator(`[data-gallery-content="${composition.path}"]`);
    await content.evaluate(element => element.setAttribute("data-command-refresh-owner", "retained"));
    await page.keyboard.press("Control+k");
    const dialog = page.getByRole("dialog", { name: "Command palette", exact: true });
    await expect(dialog).toBeVisible();
    await page.getByRole("combobox", { name: "Command palette", exact: true }).fill("refresh scenario");
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(content).toHaveAttribute("data-pending", "true");
    await expect(page.getByLabel("Scenario revision", { exact: true })).toHaveText("Revision 1");
    await expect(content).toHaveAttribute("data-command-refresh-owner", "retained");
  }
});

test("generic gallery states remove unauthorized content and recover without stale owners", async ({ page }) => {
  await page.goto("/gallery/reading");
  await ready(page);
  const content = page.locator('[data-gallery-content="/gallery/reading"]');
  await page.getByRole("button", { name: /^Scenario state /u }).click();
  await page.getByRole("option", { name: "Permission denied", exact: true }).click();
  await expect(content).toHaveCount(0);
  await expect(page.getByText("Design-system notebook was removed immediately when access changed.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator('[data-gallery-content="/gallery/reading"]')).toBeVisible();
});

test("reading composition adopts a pre-hydration draft and queued refresh without replacement", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/gallery/reading", { waitUntil: "commit" });
    const content = page.locator('[data-gallery-content="/gallery/reading"]');
    const input = page.getByRole("textbox", { name: "Retained margin note", exact: true });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-mode", "dark");
    await content.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await input.fill("Typed before hydration");
    await input.evaluate(element => element.setAttribute("data-server-draft", "retained"));
    await page.getByRole("button", { name: "Refresh scenario", exact: true }).click();
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(page.getByLabel("Scenario revision", { exact: true })).toHaveText("Revision 1");
    await expect(content).toHaveAttribute("data-server-identity", "retained");
    await expect(input).toHaveAttribute("data-server-draft", "retained");
    await expect(input).toHaveValue("Typed before hydration");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});
