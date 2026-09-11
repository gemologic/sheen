import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function choose(page: Page, label: string, option: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${label} `, "u") }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("component scopes and full-layout iframes compare independent URL-backed configurations without remounting", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/comparisons");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");

  const firstScope = page.locator(".loupe-comparison-first");
  const secondScope = page.locator(".loupe-comparison-second");
  const firstFrameElement = page.locator('iframe[title="A full layout"]');
  const secondFrameElement = page.locator('iframe[title="B full layout"]');
  const firstFrame = page.frameLocator('iframe[title="A full layout"]');
  const secondFrame = page.frameLocator('iframe[title="B full layout"]');
  await expect(firstScope).toHaveAttribute("data-sheen-theme", "obsidian");
  await expect(firstScope).toHaveAttribute("data-sheen-mode", "dark");
  await expect(firstScope).toHaveAttribute("data-sheen-density", "compact");
  await expect(secondScope).toHaveAttribute("data-sheen-theme", "paper");
  await expect(secondScope).toHaveAttribute("data-sheen-mode", "light");
  await expect(secondScope).toHaveAttribute("data-sheen-density", "spacious");
  await expect(firstFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-theme", "obsidian");
  await expect(secondFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-theme", "paper");
  await expect.poll(async () => (await firstFrameElement.boundingBox())?.width).toBe(375);
  await expect.poll(async () => (await secondFrameElement.boundingBox())?.width).toBe(1024);

  const componentDraft = firstScope.getByRole("textbox", { name: "A retained draft", exact: true });
  const layoutDraft = firstFrame.getByRole("textbox", { name: "Retained draft", exact: true });
  await componentDraft.fill("Scoped component draft");
  await layoutDraft.fill("Iframe layout draft");
  await firstScope.evaluate(element => element.setAttribute("data-comparison-identity", "retained"));
  await firstFrame.locator("[data-lab-preview]").evaluate(element => element.setAttribute("data-comparison-frame", "retained"));

  await choose(page, "A theme", "Slate");
  await choose(page, "A accent", "cyan");
  await choose(page, "A mode", "Light");
  await choose(page, "A density", "Spacious");
  await page.getByRole("spinbutton", { name: "A width", exact: true }).fill("768");

  await expect.poll(() => new URL(page.url()).searchParams.get("first.theme")).toBe("slate");
  await expect.poll(() => new URL(page.url()).searchParams.get("first.width")).toBe("768");
  await expect(firstScope).toHaveAttribute("data-sheen-theme", "slate");
  await expect(firstScope).toHaveAttribute("data-sheen-accent", "cyan");
  await expect(firstScope).toHaveAttribute("data-sheen-mode", "light");
  await expect(firstScope).toHaveAttribute("data-sheen-density", "spacious");
  await expect(firstFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-theme", "slate");
  await expect(firstFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-accent", "cyan");
  await expect.poll(async () => (await firstFrameElement.boundingBox())?.width).toBe(768);
  await expect(firstScope).toHaveAttribute("data-comparison-identity", "retained");
  await expect(firstFrame.locator("[data-lab-preview]")).toHaveAttribute("data-comparison-frame", "retained");
  await expect(componentDraft).toHaveValue("Scoped component draft");
  await expect(layoutDraft).toHaveValue("Iframe layout draft");

  await page.getByRole("button", { name: "Swap A and B", exact: true }).click();
  await expect(firstScope).toHaveAttribute("data-sheen-theme", "paper");
  await expect(secondScope).toHaveAttribute("data-sheen-theme", "slate");
  await expect(firstFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-theme", "paper");
  await expect(secondFrame.locator(".loupe-lab-preview-scope")).toHaveAttribute("data-sheen-theme", "slate");
  await expect(componentDraft).toHaveValue("Scoped component draft");
  await expect(layoutDraft).toHaveValue("Iframe layout draft");
  await expect(page.locator("html")).toHaveAttribute("data-sheen-theme", "obsidian");
  expect(errors).toEqual([]);
});
