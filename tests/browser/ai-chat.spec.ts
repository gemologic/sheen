import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const ready = (page: Page) => expect(page.locator('[data-sheen-portal="root"]')).toHaveAttribute("data-sheen-ready", "true");

test("PromptInput submits on Enter, inserts newlines on Shift+Enter, and ignores IME confirmation", async ({ page, context }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Ask the release assistant" });
  const send = page.getByRole("button", { name: "Send message" });
  const submissions = page.getByRole("status", { name: "Submissions" });
  await expect(send).toHaveAttribute("aria-disabled", "true");
  await input.focus();
  await input.press("Enter");
  await expect(submissions).toHaveText("[]");

  await input.pressSequentially("First line");
  await input.press("Shift+Enter");
  await input.pressSequentially("second line");
  await expect(input).toHaveValue("First line\nsecond line");
  await expect(submissions).toHaveText("[]");
  await expect(send).not.toHaveAttribute("aria-disabled");
  await input.press("Enter");
  await expect(submissions).toHaveText(JSON.stringify(["First line\nsecond line"]));
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "Finish response" }).click();

  await input.focus();
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send("Input.imeSetComposition", { text: "にほん", selectionStart: 3, selectionEnd: 3 });
    await expect(input).toHaveValue("にほん");
    // Enter while composing belongs to the IME candidate window, not the composer.
    await cdp.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 229, nativeVirtualKeyCode: 229 });
    await cdp.send("Input.insertText", { text: "日本" });
  } finally { await cdp.detach(); }
  await expect(input).toHaveValue("日本");
  await expect(submissions).toHaveText(JSON.stringify(["First line\nsecond line"]));
  await input.press("Enter");
  await expect(submissions).toHaveText(JSON.stringify(["First line\nsecond line", "日本"]));
});

test("PromptInput turns the same send node into a focus-retaining stop action while streaming", async ({ page }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Ask the release assistant" });
  await input.fill("Summarize the deploys");
  const action = page.locator(".sheen-prompt-input-action");
  await action.evaluate(element => element.setAttribute("data-identity", "retained"));
  await action.focus();
  await page.keyboard.press("Enter");
  const stop = page.getByRole("button", { name: "Stop response" });
  await expect(stop).toHaveAttribute("data-identity", "retained");
  await expect(stop).toBeFocused();
  await expect(stop).toHaveAttribute("type", "button");

  // A new draft may be typed while streaming, but Enter does not send it.
  await input.fill("Next question");
  await input.press("Enter");
  await expect(page.getByRole("status", { name: "Submissions" })).toHaveText(JSON.stringify(["Summarize the deploys"]));
  await expect(input).toHaveValue("Next question");

  await stop.focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("status", { name: "Stops" })).toHaveText("1");
  const send = page.getByRole("button", { name: "Send message" });
  await expect(send).toHaveAttribute("data-identity", "retained");
  await expect(send).toBeFocused();
  await expect(input).toHaveValue("Next question");
});

test("PromptInput grows to its row cap and then scrolls", async ({ page }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Ask the release assistant" });
  const height = () => input.evaluate(element => element.getBoundingClientRect().height);
  const lineHeight = await input.evaluate(element => Number.parseFloat(getComputedStyle(element).lineHeight));
  await expect.poll(height).toBe(lineHeight);
  await input.fill("One\nTwo\nThree");
  await expect.poll(height).toBe(lineHeight * 3);
  await input.fill(Array.from({ length: 20 }, (_, index) => `Line ${index}`).join("\n"));
  await expect.poll(height).toBe(lineHeight * 6);
  expect(await input.evaluate(element => element.scrollHeight > element.clientHeight)).toBe(true);
  await input.fill("");
  await expect.poll(height).toBe(lineHeight);
});

test("Conversation keeps message nodes across appends, sticks to the bottom, and stops sticking when scrolled up", async ({ page }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const log = page.getByRole("log", { name: "Release assistant" });
  const distance = () => log.evaluate(element => element.scrollHeight - element.scrollTop - element.clientHeight);
  await expect.poll(distance).toBeLessThanOrEqual(4);
  const first = log.locator('[data-id="seed-0"]');
  const last = log.locator('[data-id="seed-11"]');
  await first.evaluate(element => element.setAttribute("data-identity", "retained"));
  await last.evaluate(element => element.setAttribute("data-identity", "retained"));
  await expect(last).not.toHaveAttribute("data-entering");

  await page.getByRole("button", { name: "Append history" }).click();
  await expect(log.locator(".sheen-conversation-item")).toHaveCount(14);
  await expect(first).toHaveAttribute("data-identity", "retained");
  await expect(last).toHaveAttribute("data-identity", "retained");
  const appended = log.locator('[data-id^="follow-"]');
  expect(await appended.evaluate(element => getComputedStyle(element).getPropertyValue("--sheen-conversation-stagger"))).toBe("1");
  await expect.poll(distance).toBeLessThanOrEqual(4);
  await expect(page.getByRole("button", { name: "Jump to latest message" })).toHaveCount(0);

  // Reading earlier history must not be interrupted by new content.
  await log.focus();
  await page.keyboard.press("Home");
  await expect.poll(() => log.evaluate(element => element.scrollTop)).toBe(0);
  const jump = page.getByRole("button", { name: "Jump to latest message" });
  await expect(jump).toBeVisible();
  await page.getByRole("button", { name: "Append history" }).click();
  await expect(log.locator(".sheen-conversation-item")).toHaveCount(16);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await log.evaluate(element => element.scrollTop)).toBe(0);

  await jump.focus();
  await page.keyboard.press("Enter");
  await expect.poll(distance).toBeLessThanOrEqual(4);
  await expect(log).toBeFocused();
  await expect(jump).toHaveCount(0);

  // Returning to the bottom by scrolling resumes sticking.
  await log.evaluate(element => { element.scrollTop = 0; });
  await expect(jump).toBeVisible();
  await log.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(jump).toHaveCount(0);
  await page.getByRole("button", { name: "Append history" }).click();
  await expect(log.locator(".sheen-conversation-item")).toHaveCount(18);
  await expect.poll(distance).toBeLessThanOrEqual(4);
});

test("StreamingText grows without replacing rendered text nodes and announces completion once", async ({ page }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Ask the release assistant" });
  await input.fill("Summarize the deploys");
  await input.press("Enter");
  const log = page.getByRole("log", { name: "Release assistant" });
  const turn = log.locator('[data-id="assistant-1"]');
  const text = turn.locator(".sheen-streaming-text");
  await expect(text).toHaveAttribute("aria-busy", "true");
  const appendToken = page.getByRole("button", { name: "Append token" });
  await appendToken.click();
  await expect(text.locator("p")).toHaveCount(1);
  const paragraph = await text.locator("p").first().elementHandle();
  const textNode = await text.locator("p").first().evaluateHandle(element => element.firstChild);
  const article = await turn.locator("article").elementHandle();
  // Sample every frame while streaming so a transient replacement cannot hide behind a correct final state.
  await page.evaluate(([original]) => {
    const root = document.documentElement;
    let replaced = 0;
    const sample = () => {
      const current = document.querySelector('[data-id="assistant-1"] .sheen-streaming-text p');
      if (current !== original) replaced += 1;
      root.dataset.streamingReplaced = String(replaced);
      if (document.querySelector('[data-id="assistant-1"] .sheen-streaming-text[aria-busy]')) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, [paragraph]);
  for (let index = 0; index < 8; index += 1) await appendToken.click();
  await expect(text.locator("p").first()).toHaveText(/^Three deploys shipped yesterday\. The billing worker /u);
  const retained = () => page.evaluate(([original, originalText, originalArticle]) => {
    const current = document.querySelector('[data-id="assistant-1"] .sheen-streaming-text p');
    return { paragraph: current === original, text: current?.firstChild === originalText, article: document.querySelector('[data-id="assistant-1"] article') === originalArticle, textNodes: current?.childNodes.length, replaced: document.documentElement.dataset.streamingReplaced };
  }, [paragraph, textNode, article]);
  expect(await retained()).toEqual({ paragraph: true, text: true, article: true, textNodes: 1, replaced: "0" });

  // Crossing a paragraph break keeps the finished paragraph and appends a new one.
  for (let index = 0; index < 20; index += 1) await appendToken.click();
  await expect(text.locator("p")).toHaveCount(2);
  expect(await retained()).toMatchObject({ paragraph: true, text: true, article: true });
  await expect(text.locator('[role="status"]')).toHaveText("");
  await page.getByRole("button", { name: "Finish response" }).click();
  await expect(text).not.toHaveAttribute("aria-busy");
  await expect(text.locator('[role="status"]')).toHaveText("Response complete");
  expect(await retained()).toMatchObject({ paragraph: true, text: true, article: true, replaced: "0" });
});

test("PromptInput adopts a draft typed before hydration without replacing the server textarea", async ({ page }) => {
  let release: () => void = () => {};
  const barrier = new Promise<void>(resolve => { release = resolve; });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/*", async route => {
    if (route.request().resourceType() === "script") await barrier;
    await route.continue();
  });
  try {
    await page.goto("/ai-chat", { waitUntil: "commit" });
    const input = page.getByRole("textbox", { name: "Ask the release assistant" });
    const log = page.getByRole("log", { name: "Release assistant" });
    await expect(log.locator('[data-id="seed-11"]')).toBeVisible();
    await input.evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await log.locator('[data-id="seed-0"]').evaluate(element => element.setAttribute("data-server-identity", "retained"));
    await input.fill("Typed before hydration");
    release();
    await ready(page);
    await expect(input).toHaveAttribute("data-server-identity", "retained");
    await expect(log.locator('[data-id="seed-0"]')).toHaveAttribute("data-server-identity", "retained");
    await expect(log.locator("[data-entering]")).toHaveCount(0);
    await expect(input).toHaveValue("Typed before hydration");
    await expect(page.getByRole("status", { name: "Draft" })).toHaveText(JSON.stringify("Typed before hydration"));
    await input.press("Enter");
    await expect(page.getByRole("status", { name: "Submissions" })).toHaveText(JSON.stringify(["Typed before hydration"]));
    expect(errors).toEqual([]);
  } finally { release(); }
});

test("chat fixture has no automated WCAG A/AA violations while streaming and scrolled away", async ({ page }) => {
  await page.goto("/ai-chat");
  await ready(page);
  const input = page.getByRole("textbox", { name: "Ask the release assistant" });
  await input.fill("Summarize the deploys");
  await input.press("Enter");
  await page.getByRole("button", { name: "Append token" }).click();
  const log = page.getByRole("log", { name: "Release assistant" });
  await log.evaluate(element => { element.scrollTop = 0; });
  await expect(page.getByRole("button", { name: "Jump to latest message" })).toBeVisible();
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target.join(" ")) }))).toEqual([]);
});
