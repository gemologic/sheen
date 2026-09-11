import { expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { ShortcutProvider } from "./ShortcutProvider.tsx";
import { ShortcutPending } from "./ShortcutPending.tsx";

it("server renders an empty persistent localized status without a focus target", () => {
  const html = renderToString(() => <ThemeProvider messages={{ pendingShortcut: "Raccourci en attente" }}><ShortcutProvider platform="other" development={true}><ShortcutPending class="custom" data-test="feedback" /></ShortcutProvider></ThemeProvider>);
  expect(html).toContain('role="status"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-atomic="true"');
  expect(html).toContain('aria-label="Raccourci en attente"');
  expect(html).toMatch(/class="sheen-shortcut-pending custom\s*"/);
  expect(html).toContain('data-test="feedback"');
  expect(html).not.toContain("tabindex");
  expect(html).not.toContain("<kbd");
  expect(() => renderToString(() => <ShortcutPending />)).toThrow("ShortcutProvider context");
});
