import { expect, test } from "@playwright/test";

test.use({ channel: "chromium" });

test("a draft typed before hydration is retained and registered after replay", async ({ page }) => {
  let release = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/unsaved", { waitUntil: "commit" });
    const draft = page.getByRole("textbox", { name: "Unsaved draft", exact: true });
    await draft.evaluate(element => element.setAttribute("data-server", "retained"));
    await draft.fill("Early draft");
    release();
    await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
    await expect(draft).toHaveAttribute("data-server", "retained");
    await expect(draft).toHaveValue("Early draft");
  } finally { release(); }
});

test("saving one editor cannot clear another editor's dirty guard", async ({ page }) => {
  await page.goto("/unsaved");
  await page.getByRole("button", { name: "Toggle secondary" }).click();
  await page.getByRole("textbox", { name: "Unsaved draft", exact: true }).fill("First");
  await page.getByRole("textbox", { name: "Secondary draft", exact: true }).fill("Second");
  await expect(page.getByRole("status", { name: "Secondary dirty" })).toHaveText("true");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("false");
  let promptType: string | undefined;
  page.once("dialog", async prompt => { promptType = prompt.type(); await prompt.accept(); });
  await page.reload();
  expect(promptType).toBe("beforeunload");
  await expect(page.getByRole("textbox", { name: "Unsaved draft", exact: true })).toHaveValue("");
});

test("dirty reload prompts, cancellation preserves the draft, and saving removes the guard", async ({ page }) => {
  await page.goto("/unsaved");
  await page.getByRole("textbox", { name: "Unsaved draft" }).click();
  await page.getByRole("textbox", { name: "Unsaved draft" }).fill("Keep this draft");
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
  let promptType: string | undefined;
  page.once("dialog", async prompt => { promptType = prompt.type(); await prompt.dismiss(); });
  await page.reload({ timeout: 5000 }).catch(() => null);
  expect(promptType).toBe("beforeunload");
  await expect(page.getByRole("textbox", { name: "Unsaved draft" })).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("false");
  page.on("dialog", async unexpected => { await unexpected.dismiss(); throw new Error("Clean editor prompted before unload"); });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Unsaved draft" })).toHaveValue("");
});

test("disposing the dirty editor removes its unload guard", async ({ page }) => {
  await page.goto("/unsaved");
  await page.getByRole("textbox", { name: "Unsaved draft" }).fill("Discarded by app");
  await expect(page.getByRole("status", { name: "Editor dirty" })).toHaveText("true");
  await page.getByRole("button", { name: "Toggle editor" }).click();
  await expect(page.getByRole("textbox", { name: "Unsaved draft" })).toHaveCount(0);
  page.on("dialog", async unexpected => { await unexpected.dismiss(); throw new Error("Disposed editor prompted before unload"); });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Unsaved draft" })).toHaveValue("");
});
