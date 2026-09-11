import { expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ShortcutProvider, useShortcut, useShortcutBindings } from "./ShortcutProvider.tsx";

it("server renders owned bindings without document access or executing actions", () => {
  let calls = 0;
  function Content() {
    useShortcut({ keys: "g", scope: "global", label: "Go", group: "Navigation", run: () => { calls++; } });
    return <p>Workspace</p>;
  }
  const html = renderToString(() => <ShortcutProvider platform="other" development={true}><Content /></ShortcutProvider>);
  expect(html).toContain("Workspace");
  expect(calls).toBe(0);
  expect(() => renderToString(() => <Content />)).toThrow("ShortcutProvider context");
});

it("automatic platform SSR exposes no provisional platform bindings", () => {
  function Content() {
    useShortcut({ keys: "mod+j", scope: "global", label: "Jump", group: "Navigation", run: () => {} });
    const bindings = useShortcutBindings();
    return <output>{bindings().length}</output>;
  }
  const html = renderToString(() => <ShortcutProvider development={true}><Content /></ShortcutProvider>);
  expect(html).toMatch(/<output[^>]*>0<\/output>/);
  expect(html).not.toContain("Ctrl");
  expect(html).not.toContain("⌘");
});
