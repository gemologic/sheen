import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Button } from "./Button.tsx";
import { ShortcutProvider } from "./ShortcutProvider.tsx";
import type { ShortcutAction } from "../utils/shortcut-registry.ts";

const save = { keys: "mod+s", scope: "global", label: "Save", group: "Editing" } satisfies ShortcutAction;

describe("Button server contract", () => {
  it("keeps typed shortcut metadata out of native markup and needs no provider for ordinary rendering", () => {
    const html = renderToString(() => <Button shortcut={save}>Save</Button>);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).not.toMatch(/shortcut|mod\+s|Editing/);
  });

  it("retains native loading suppression inside a shortcut owner", () => {
    const html = renderToString(() => <ShortcutProvider platform="other" development={true}><Button shortcut={save} loading>Save</Button></ShortcutProvider>);
    expect(html).toContain(" disabled");
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toMatch(/shortcut=|mod\+s/);
  });
});
