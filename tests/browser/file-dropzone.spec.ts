import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("FileDropzone provides native picker parity, validates files, and renders app-owned progress without replacing items", async ({ page }) => {
  await page.goto("/file-dropzone");
  await expect(page.getByText("Choose files", { exact: true }).first()).toBeVisible();
  const target = page.locator(".loupe-file-dropzone-bounds .sheen-file-dropzone-target");
  const targetBox = await target.boundingBox();
  expect(targetBox?.height).toBeGreaterThanOrEqual(90);
  const chooser = page.waitForEvent("filechooser");
  await target.getByText("Drag files here or choose from this device.", { exact: true }).click();
  await chooser;
  const input = page.getByLabel("Evidence files", { exact: true });
  await input.setInputFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") },
    { name: "program.exe", mimeType: "application/octet-stream", buffer: Buffer.from("no") },
  ]);
  const item = page.locator('.sheen-file-dropzone-item[data-file-id="file-1"]');
  await expect(item).toHaveAttribute("data-status", "uploading");
  await item.evaluate(element => element.setAttribute("data-upload-owner", "retained"));
  await expect(page.getByText("program.exe is not an accepted file type.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Rejected files")).toHaveText("type:program.exe");
  await expect(item).toHaveAttribute("data-status", "complete");
  await expect(item).toHaveAttribute("data-upload-owner", "retained");
  await expect(item.getByText("Upload complete", { exact: true })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(axe.violations).toEqual([]);
});

test("FileDropzone fills centered component documentation previews", async ({ page }) => {
  await page.goto("/components");
  const catalogPreview = page.locator('[data-component="FileDropzone"] [data-component-preview]');
  await catalogPreview.scrollIntoViewIfNeeded();
  const catalogPreviewBox = await catalogPreview.boundingBox();
  const catalogDropzoneBox = await catalogPreview.locator(".sheen-file-dropzone").boundingBox();
  expect(catalogPreviewBox).not.toBeNull();
  expect(catalogDropzoneBox).not.toBeNull();
  expect(catalogDropzoneBox?.width).toBeGreaterThan((catalogPreviewBox?.width ?? 0) * 0.8);
  expect(catalogDropzoneBox?.width).toBeLessThanOrEqual(catalogPreviewBox?.width ?? 0);

  await page.goto("/components/FileDropzone");
  const playground = page.locator("[data-playground-preview]");
  const playgroundBox = await playground.boundingBox();
  const playgroundDropzoneBox = await playground.locator(".sheen-file-dropzone").boundingBox();
  expect(playgroundBox).not.toBeNull();
  expect(playgroundDropzoneBox).not.toBeNull();
  expect(playgroundDropzoneBox?.width).toBeGreaterThan((playgroundBox?.width ?? 0) * 0.8);
  expect(playgroundDropzoneBox?.width).toBeLessThanOrEqual(playgroundBox?.width ?? 0);
});

test("FileDropzone announces native drag state and dropped files take the same upload path", async ({ page }) => {
  await page.goto("/file-dropzone");
  const root = page.locator(".loupe-file-dropzone-bounds .sheen-file-dropzone");
  await root.evaluate(element => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["dragged"], "dragged.txt", { type: "text/plain" }));
    element.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(root.locator(".sheen-file-dropzone-announcer")).toHaveText("Drop files here");
  await expect(root).toHaveAttribute("data-drag-active");
  const response = page.waitForResponse(response => response.url().includes("/api/file-upload") && response.request().method() === "POST");
  await root.evaluate(element => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["dragged"], "dragged.txt", { type: "text/plain" }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  expect((await response).ok()).toBe(true);
  await expect(root).not.toHaveAttribute("data-drag-active");
  await expect(root.locator('.sheen-file-dropzone-item[data-status="complete"]')).toContainText("dragged.txt");
});

test("FileDropzone keeps failed items for app-owned retry and removal", async ({ page }) => {
  await page.goto("/file-dropzone");
  const input = page.getByLabel("Evidence files", { exact: true });
  await input.setInputFiles({ name: "retry.txt", mimeType: "text/plain", buffer: Buffer.from("retry") });
  const item = page.locator('.sheen-file-dropzone-item[data-file-id="file-1"]');
  await expect(item).toHaveAttribute("data-status", "error");
  await item.evaluate(element => element.setAttribute("data-retry-owner", "retained"));
  await item.getByRole("button", { name: "Retry retry.txt", exact: true }).click();
  await expect(item).toHaveAttribute("data-status", "uploading");
  await expect(item).toHaveAttribute("data-status", "complete");
  await expect(item).toHaveAttribute("data-retry-owner", "retained");
  await item.getByRole("button", { name: "Remove retry.txt", exact: true }).click();
  await expect(item).toHaveCount(0);
});

test("FileDropzone adopts a pre-hydration native file selection without replacing the picker", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => { if (route.request().resourceType() === "script") await barrier; await route.continue(); });
  try {
    await page.goto("/file-dropzone", { waitUntil: "commit" });
    const input = page.getByLabel("Evidence files", { exact: true });
    await input.setInputFiles({ name: "early.txt", mimeType: "text/plain", buffer: Buffer.from("early") });
    await input.evaluate(element => element.setAttribute("data-file-hydration", "retained"));
    release();
    await expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");
    await expect(input).toHaveAttribute("data-file-hydration", "retained");
    await expect(page.locator('.loupe-file-dropzone-bounds .sheen-file-dropzone-item[data-status="complete"]')).toContainText("early.txt");
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("FileDropzone read-only state preserves files and blocks picker and actions", async ({ page }) => {
  await page.goto("/file-dropzone");
  const scope = page.locator(".loupe-file-dropzone-scope");
  await expect(scope.getByLabel("Read-only files", { exact: true })).toBeDisabled();
  const remove = scope.getByRole("button", { name: "Remove contract.pdf", exact: true });
  await expect(remove).toHaveAttribute("aria-disabled", "true");
  await remove.click({ force: true });
  await expect(scope.getByText("contract.pdf", { exact: true })).toBeVisible();
});

test("FileDropzone enforces size and total-count limits for picker input", async ({ page }) => {
  await page.goto("/file-dropzone");
  const input = page.getByLabel("Evidence files", { exact: true });
  await input.setInputFiles({ name: "large.txt", mimeType: "text/plain", buffer: Buffer.from("x".repeat(65)) });
  await expect(page.getByText("large.txt exceeds the 64 B limit.", { exact: true })).toBeVisible();
  await input.setInputFiles([
    { name: "one.txt", mimeType: "text/plain", buffer: Buffer.from("1") },
    { name: "two.txt", mimeType: "text/plain", buffer: Buffer.from("2") },
    { name: "three.txt", mimeType: "text/plain", buffer: Buffer.from("3") },
    { name: "four.txt", mimeType: "text/plain", buffer: Buffer.from("4") },
  ]);
  await expect(page.locator(".loupe-file-dropzone-bounds .sheen-file-dropzone-item")).toHaveCount(3);
  await expect(page.getByLabel("Rejected files")).toHaveText("count:four.txt");
});
