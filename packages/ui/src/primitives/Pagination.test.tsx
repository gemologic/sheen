import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, ThemeScope } from "../theme/ThemeProvider.tsx";
import { Pagination } from "./Pagination.tsx";

describe("Pagination SSR", () => {
  it("bounds numbered controls and exposes accepted state and a live summary", () => {
    const html = renderToString(() => <ThemeProvider><Pagination pageIndex={500} pageCount={100000} onPageChange={() => {}} /></ThemeProvider>);
    expect(html.match(/<button\b/g)).toHaveLength(9);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain("Page 501 of 100,000");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-label="Pagination"');
  });
  it("represents empty results without a fictitious first page", () => {
    const html = renderToString(() => <ThemeProvider><Pagination pageIndex={0} pageCount={0} onPageChange={() => {}} /></ThemeProvider>);
    expect(html).toContain("Page 0 of 0");
    expect(html).not.toContain('aria-current="page"');
    expect(html.match(/aria-disabled="true"/g)).toHaveLength(4);
  });
  it("separates unavailable navigation from pending work", () => {
    const html = renderToString(() => <ThemeProvider><Pagination pageIndex={0} pageCount={3} disabled onPageChange={() => {}} /></ThemeProvider>);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('aria-busy="true"');
    expect(html).not.toContain('data-pending');
  });
  it("uses explicit scoped number formatting and translated message templates", () => {
    const html = renderToString(() => <ThemeProvider><ThemeScope locale="de-DE" messages={{ pagination: "Seitennavigation", pageLabel: "Seite {page}", pageStatus: "Seite {page} von {pages}", nextPage: "Weiter" }}><Pagination pageIndex={9999} pageCount={100000} onPageChange={() => {}} /></ThemeScope></ThemeProvider>);
    expect(html).toContain('aria-label="Seitennavigation"');
    expect(html).toContain('aria-label="Seite 10.000"');
    expect(html).toContain("Seite 10.000 von 100.000");
    expect(html).toContain("Weiter");
  });
  it("rejects invalid or incoherent accepted state", () => {
    for (const [index, count] of [[-1, 5], [5, 5], [1, 0], [0, -1], [0, 1.5], [0, Infinity]]) {
      expect(() => renderToString(() => <ThemeProvider><Pagination pageIndex={index ?? 0} pageCount={count ?? 0} onPageChange={() => {}} /></ThemeProvider>)).toThrow("Pagination");
    }
  });
});
