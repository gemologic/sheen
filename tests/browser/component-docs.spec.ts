import { expect, test } from "@playwright/test";
import { componentDocs } from "../../apps/loupe/src/generated/component-docs.ts";

test("generated component inventory exposes every validated public component", async ({ page }) => {
  await page.goto("/components");
  await expect(page.getByRole("heading", { name: "Component laboratory", level: 1 })).toBeVisible();
  await expect(page.locator("[data-component]")).toHaveCount(componentDocs.length);
  await expect(page.locator("[data-component-preview]")).toHaveCount(componentDocs.length);
  await expect(page.getByRole("link", { name: "Button", exact: true })).toHaveAttribute("href", "/components/Button");
  const search = page.getByRole("searchbox", { name: "Find a component", exact: true });
  await search.fill("CommandPalette");
  await expect(page.locator("[data-component]")).toHaveCount(1);
  await expect(page.locator('[data-component="CommandPalette"] [data-component-preview]')).toHaveCount(1);
  await search.fill("");
  await expect(page.locator("[data-component]")).toHaveCount(componentDocs.length);
  const scroll = await page.locator("#app").evaluate(element => {
    const before = element.scrollTop;
    element.scrollTo({ top: 640, behavior: "instant" });
    return { before, after: element.scrollTop, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY };
  });
  expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
  expect(scroll.after).toBeGreaterThan(scroll.before);
  expect(scroll.overflowY).toBe("auto");
  const buttonPreview = page.locator('[data-component="Button"] [data-component-preview]');
  await buttonPreview.scrollIntoViewIfNeeded();
  await expect(buttonPreview.locator(".sheen-button")).toBeVisible();
  await expect(page.getByText("Triggers an action. Use a link for navigation.", { exact: true })).toBeVisible();
});

test("component pages derive live controls, code, variants, anatomy, props, and accessibility from metadata", async ({ page }) => {
  await page.goto("/components/Button");
  await expect(page.getByRole("heading", { name: "Button", level: 1 })).toBeVisible();
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const preview = page.locator("[data-playground-preview]");
  const button = preview.getByRole("button", { name: "Cancel", exact: true });
  await expect(button).toHaveAttribute("data-variant", "ghost");
  await page.getByRole("combobox", { name: "variant", exact: true }).selectOption({ label: "solid" });
  await expect(page.getByLabel("Generated example code")).toContainText('variant="solid"');
  await expect(button).toHaveAttribute("data-variant", "solid");
  await expect(page.locator(".loupe-variant-grid > .sheen-surface")).toHaveCount(16);
  await expect(page.getByText("packages/ui/src/primitives/Button.tsx", { exact: true })).toBeVisible();
  await expect(page.getByText("--sheen-button-radius", { exact: true })).toBeVisible();
  await expect(page.getByText("Role: button", { exact: true })).toBeVisible();
  const props = page.getByRole("table", { name: "Button authored props", exact: true });
  await expect(props.getByRole("row")).toHaveCount(6);
  await expect(props.getByRole("rowheader", { name: "variant", exact: true })).toBeVisible();
  await expect(props.getByText("onClick", { exact: true })).toHaveCount(0);
  await expect(page.locator(".loupe-doc-heading")).toHaveScreenshot("component-doc-button-dark.png");
});

test("component documentation hydrates the generated server preview in place", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/components/Button", { waitUntil: "commit" });
    const preview = page.locator("[data-playground-preview]");
    const button = preview.getByRole("button", { name: "Cancel", exact: true });
    await expect(button).toBeVisible();
    await button.evaluate(element => element.setAttribute("data-server", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(button).toHaveAttribute("data-server", "retained");
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test("literal Icon documentation is transformed and remains live", async ({ page }) => {
  await page.goto("/components/Icon");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
  const preview = page.locator("[data-playground-preview] .sheen-icon");
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveCSS("inline-size", "16px");
  await page.getByRole("combobox", { name: "size", exact: true }).selectOption("lg");
  await expect(preview).toHaveCSS("inline-size", "20px");
  await expect(page.getByLabel("Generated example code")).toContainText('size="lg"');
});
