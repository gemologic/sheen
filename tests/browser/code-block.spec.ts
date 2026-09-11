import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("CodeBlock copies exact source and exposes its complete header", async ({ baseURL, context, page }) => {
  if (!baseURL) throw new Error("CodeBlock browser test requires a base URL");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL).origin });
  await page.goto("/code-block");
  const block = page.locator(".sheen-code-block");
  await expect(block.getByText("stable.ts", { exact: true })).toBeVisible();
  await expect(block.getByText("Stable TypeScript example", { exact: true })).toBeVisible();
  await expect(block.getByText("ts", { exact: true })).toBeVisible();
  await expect(block.locator('[data-line="2"]')).toHaveAttribute("data-highlighted", "true");
  await expect(block.getByLabel("Stable TypeScript example")).toHaveAttribute("aria-describedby");
  await block.getByRole("button", { name: "Copy code" }).click();
  await expect(block.getByRole("button", { name: "Copied" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe("const stable = true;\nconsole.log(stable);");
});

test("CodeBlock wrapping and accepted source refresh retain the code owner, line owners, and focus", async ({ page }) => {
  await page.goto("/code-block");
  const block = page.locator(".sheen-code-block");
  const region = block.getByLabel("Stable TypeScript example");
  const secondLine = block.locator('[data-line="2"]');
  await region.evaluate(element => element.setAttribute("data-owner", "retained"));
  await secondLine.evaluate(element => element.setAttribute("data-line-owner", "retained"));
  await block.getByRole("button", { name: "Wrap code" }).click();
  await expect(block).toHaveAttribute("data-wrap", "true");
  await expect(block.getByRole("button", { name: "Stop wrapping code" })).toHaveAttribute("aria-pressed", "true");
  const refresh = page.getByRole("button", { name: "Refresh code" });
  await refresh.focus();
  await refresh.press("Enter");
  await expect(refresh).toBeFocused();
  await expect(region).toHaveAttribute("data-owner", "retained");
  await expect(secondLine).toHaveAttribute("data-line-owner", "retained");
  await expect(secondLine).toContainText("accepted refresh");
  await expect(block).toHaveAttribute("data-wrap", "true");
});

test("CodeBlock swaps token colors without remounting accepted content", async ({ page }) => {
  await page.goto("/code-block");
  const token = page.locator(".sheen-code-block-token").first();
  await token.evaluate(element => element.setAttribute("data-stable", "retained"));
  const before = await token.evaluate(element => getComputedStyle(element).color);
  await page.getByRole("button", { name: "Toggle mode" }).click();
  await expect(token).toHaveAttribute("data-stable", "retained");
  await expect.poll(() => token.evaluate(element => getComputedStyle(element).color)).not.toBe(before);
});

test("CodeBlock retains complete server markup through delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/code-block", { waitUntil: "commit" });
    const code = page.getByLabel("Stable TypeScript example");
    await expect(code).toContainText("const stable = true;");
    await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Wrap code" })).toBeVisible();
    await code.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(code).toHaveAttribute("data-server", "retained");
  } finally { release(); }
});

test("CodeBlock has no automated WCAG A or AA violations", async ({ page }) => {
  await page.goto("/code-block");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
