import { expect, test } from "@playwright/test";

test("Resizable persists keyboard changes through its real Corvu integration", async ({ page }) => {
  await page.goto("/resizable");
  const separator = page.getByRole("separator", { name: "Resize files and preview" });
  await expect(separator).toHaveAttribute("aria-valuenow", "35");
  await separator.focus();
  await separator.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "40");
  await expect(page.getByRole("status", { name: "Resizable sizes" })).toHaveText("40 / 60");
  await expect(page.getByRole("status", { name: "Resizable saves" })).toHaveText("1");
});

test("Resizable retains server geometry and DOM identity through delayed hydration", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/resizable", { waitUntil: "commit" });
    const files = page.getByText("Files", { exact: true }).locator("..");
    await expect(files).toHaveCSS("flex-basis", "35%");
    await files.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(files).toHaveAttribute("data-server", "retained");
    await expect(files).toHaveCSS("flex-basis", "35%");
  } finally { release(); }
});
