import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { ContextMenu } from "./ContextMenu.tsx";

describe("ContextMenu SSR", () => {
  it("retains the requested native trigger and leaves an empty replacement native", () => {
    const enabled = renderToString(() => <ThemeProvider><ContextMenu as="li" items={[{ kind: "action", id: "open", label: "Open", onSelect: () => {} }]}>Account actions</ContextMenu></ThemeProvider>);
    expect(enabled).toContain("<li");
    expect(enabled).toContain("Account actions");
    expect(enabled).not.toContain('data-disabled=""');
    const empty = renderToString(() => <ThemeProvider><ContextMenu as="div" items={[]}>Native actions</ContextMenu></ThemeProvider>);
    expect(empty).toContain("<div");
    expect(empty).toContain("Native actions");
    expect(empty).not.toContain('aria-haspopup="menu"');
  });

  it("validates the complete menu tree before interaction", () => {
    expect(() => renderToString(() => <ThemeProvider><ContextMenu items={[
      { kind: "action", id: "same", label: "First", onSelect: () => {} },
      { kind: "action", id: "same", label: "Second", onSelect: () => {} },
    ]}>Duplicate</ContextMenu></ThemeProvider>)).toThrow("duplicate sibling ID");
  });
});
