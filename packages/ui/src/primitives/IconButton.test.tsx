import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { IconButton } from "./IconButton.tsx";

describe("IconButton SSR", () => {
  it("renders one named native button and hides decorative content", () => {
    const html = renderToString(() => <ThemeProvider><IconButton label="More actions" class="custom">⋯</IconButton></ThemeProvider>);
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain('aria-label="More actions"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('type="button"');
    expect(html).toContain("sheen-icon-button custom");
  });
  it("uses native disabled state during loading and validates its name", () => {
    const html = renderToString(() => <ThemeProvider><IconButton label="Save" loading>+</IconButton></ThemeProvider>);
    expect(html).toContain(" disabled");
    expect(html).toContain('aria-busy="true"');
    expect(() => renderToString(() => <ThemeProvider><IconButton label=" ">+</IconButton></ThemeProvider>)).toThrow("nonempty accessible label");
  });
});
