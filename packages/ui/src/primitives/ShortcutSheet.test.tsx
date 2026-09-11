import { expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { ShortcutProvider } from "./ShortcutProvider.tsx";
import { ShortcutSheet } from "./ShortcutSheet.tsx";

it("server renders a discoverable shortcut sheet trigger with owned contexts", () => {
  const html = renderToString(() => <ThemeProvider><ShortcutProvider platform="mac" development={true}><ShortcutSheet title="Shortcuts" trigger="Keyboard help" /></ShortcutProvider></ThemeProvider>);
  expect(html).toContain("Keyboard help");
  expect(html).toContain('aria-haspopup="dialog"');
  expect(html).not.toContain('class="sheen-dialog"');
  expect(() => renderToString(() => <ThemeProvider><ShortcutSheet title="Shortcuts" /></ThemeProvider>)).toThrow("ShortcutProvider context");
});
