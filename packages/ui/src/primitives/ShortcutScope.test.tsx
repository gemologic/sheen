import { expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ShortcutProvider } from "./ShortcutProvider.tsx";
import { ShortcutScope } from "./ShortcutScope.tsx";

it("server renders scope boundaries without adding focus stops or accessing the DOM", () => {
  const html = renderToString(() => <ShortcutProvider development={true}><ShortcutScope scope="view" class="custom" aria-label="Workspace"><ShortcutScope scope="pane"><button>Action</button></ShortcutScope></ShortcutScope></ShortcutProvider>);
  expect(html).toContain('data-sheen-shortcut-scope="view"');
  expect(html).toContain('data-sheen-shortcut-scope="pane"');
  expect(html).toContain('aria-label="Workspace"');
  expect(html).toMatch(/class="sheen-shortcut-scope custom\s*"/);
  expect(html).not.toContain("tabindex");
  expect(() => renderToString(() => <ShortcutScope scope="pane" />)).toThrow("ShortcutProvider context");
});
