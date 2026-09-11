import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { ErrorState } from "./ErrorState.tsx";

describe("ErrorState SSR", () => {
  it("renders localized error kinds without inventing retry actions", () => {
    const html = renderToString(() => <ThemeProvider messages={{ notFound: "Nicht gefunden", permissionDenied: "Kein Zugriff", serverError: "Fehler" }}><ErrorState kind="not-found" /><ErrorState kind="permission-denied" /><ErrorState /></ThemeProvider>);
    expect(html).toContain("Nicht gefunden");
    expect(html).toContain("Kein Zugriff");
    expect(html).toContain("Fehler");
    expect(html).not.toContain("<button");
    const names = Array.from(html.matchAll(/aria-labelledby="([^"]+)"/g), match => match[1]);
    expect(new Set(names).size).toBe(3);
    for (const name of names) expect(html).toContain(`id="${name}"`);
  });
  it("forwards native attributes and renders inert retry without calling it on the server", () => {
    let attempts = 0;
    const html = renderToString(() => <ThemeProvider><ErrorState title="Orders unavailable" headingLevel={3} description="Try again shortly." onRetry={() => { attempts++; }} hidden><a href="/help">Help</a></ErrorState></ThemeProvider>);
    expect(attempts).toBe(0);
    expect(html).toContain("<h3");
    expect(html).toContain("Orders unavailable");
    expect(html).toContain("Try again shortly.");
    expect(html).toContain("Retry");
    expect(html).toContain('href="/help"');
    expect(html).toMatch(/\bhidden(?:[ =>])/);
    expect(() => renderToString(() => <ThemeProvider><ErrorState title=" " /></ThemeProvider>)).toThrow("nonempty title");
  });
});
