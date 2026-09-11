import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function visibleSets(locator: Locator): Promise<readonly (string | null)[]> {
  return locator.evaluate(element => [...element.querySelectorAll(":scope > svg")]
    .filter(svg => getComputedStyle(svg).display !== "none")
    .map(svg => svg.getAttribute("data-sheen-icon-set-value")));
}

test("semantic icons switch artwork without remounting or blank frames", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/icons");
  await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");

  const root = page.locator("html");
  const literal = page.locator("#root-literal-icon");
  const scope = page.locator(".loupe-icon-scope");
  await expect(root).toHaveAttribute("data-sheen-icon-set", "radix");
  expect(await visibleSets(literal)).toEqual(["radix"]);
  await expect(scope).toHaveAttribute("data-sheen-icon-set", "phosphor");
  expect(await visibleSets(scope.locator("#scope-icon"))).toEqual(["phosphor"]);
  await literal.evaluate(element => element.setAttribute("data-browser-identity", "retained"));

  const frames = await page.locator("#use-vellum").evaluate(async button => {
    if (!(button instanceof HTMLButtonElement)) throw new Error("theme control is not a button");
    button.click();
    const sample = (): readonly (string | null)[] => {
      const icon = document.getElementById("root-literal-icon");
      if (!icon) throw new Error("root icon disappeared");
      return [...icon.querySelectorAll(":scope > svg")].filter(svg => getComputedStyle(svg).display !== "none").map(svg => svg.getAttribute("data-sheen-icon-set-value"));
    };
    const result: (readonly (string | null)[])[] = [sample()];
    for (let frame = 0; frame < 12; frame++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      result.push(sample());
    }
    return result;
  });
  expect(frames).toEqual(Array.from({ length: 13 }, () => ["phosphor"]));
  await expect(root).toHaveAttribute("data-sheen-theme", "vellum");
  await expect(root).toHaveAttribute("data-sheen-icon-set", "phosphor");
  await expect(literal).toHaveAttribute("data-browser-identity", "retained");

  const sizes = await Promise.all(["root-literal-icon", "root-static-icon", "root-dynamic-icon"].map(id => page.locator(`#${id}`).evaluate(element => getComputedStyle(element).inlineSize)));
  expect(sizes).toEqual(["14px", "16px", "20px"]);
  await expect(page.getByRole("img", { name: "Literal search" })).toHaveAttribute("id", "root-literal-icon");
  await expect(page.locator("#root-static-icon")).toHaveAttribute("aria-hidden", "true");

  await expect(scope).toHaveAttribute("data-sheen-icon-set", "phosphor");
  expect(await visibleSets(scope.locator("#scope-icon"))).toEqual(["phosphor"]);
  await scope.getByRole("button", { name: "Open scoped icon dialog" }).click();
  const scopedPortal = scope.locator('[data-sheen-portal="scope"]');
  await expect(scopedPortal).toHaveAttribute("data-sheen-icon-set", "phosphor");
  expect(await visibleSets(scopedPortal.locator("#scope-dialog-icon"))).toEqual(["phosphor"]);
  expect(errors).toEqual([]);
});

test("persisted icon artwork is correct before delayed hydration and remains stable", async ({ page }) => {
  let releaseScripts: () => void = () => {};
  const scriptsReleased = new Promise<void>(resolve => { releaseScripts = resolve; });
  await page.addInitScript(() => localStorage.setItem("sheen", JSON.stringify({ theme: "vellum", mode: "dark", accent: "cyan" })));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await scriptsReleased;
    await route.continue();
  });
  try {
    await page.goto("/icons", { waitUntil: "commit" });
    await expect(page.locator("html")).toHaveAttribute("data-sheen-icon-set", "phosphor");
    const literal = page.locator("#root-literal-icon");
    expect(await visibleSets(literal)).toEqual(["phosphor"]);
    await literal.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    releaseScripts();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(literal).toHaveAttribute("data-server-identity", "retained");
    expect(await visibleSets(literal)).toEqual(["phosphor"]);
  } finally {
    releaseScripts();
  }
});
