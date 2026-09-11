import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Tooltip } from "./Tooltip.tsx";
import { Popover } from "./Popover.tsx";

describe("floating layer server triggers", () => {
  it("renders one native tooltip action with disabled/loading and form semantics", () => {
    const html = renderToString(() => <ThemeProvider><Tooltip content="Save settings" shortcut="mod+s" type="submit" name="action" value="save" loading>Save</Tooltip></ThemeProvider>);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('type="submit"');
    expect(html).toContain('name="action"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).not.toContain('role="tooltip"');
  });
  it("renders a labeled popover trigger without premature portal content", () => {
    const html = renderToString(() => <ThemeProvider><Popover title="View options" trigger="Open options">Content</Popover></ThemeProvider>);
    expect(html).toContain("Open options");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('class="sheen-popover"');
  });
});
