import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Spinner } from "./Spinner.tsx";

describe("Spinner SSR", () => {
  it("uses localized atomic status text without a keyboard stop", () => {
    const html = renderToString(() => <ThemeProvider messages={{ loading: "Wird geladen" }}><Spinner /></ThemeProvider>);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain("Wird geladen");
    expect(html).toContain('data-size="md"');
    expect(html).not.toContain("tabindex");
  });
  it("suppresses duplicate announcements in decorative mode", () => {
    const html = renderToString(() => <ThemeProvider><Spinner decorative label="Do not announce" size="lg" hidden class="custom" /></ThemeProvider>);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain("Do not announce");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain("custom");
    expect(html).toMatch(/\bhidden(?:[ =>])/);
  });
});
