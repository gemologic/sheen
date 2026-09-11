import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { EmptyState } from "./EmptyState.tsx";

describe("EmptyState SSR", () => {
  it("localizes distinct outcomes and gives every region its own stable visible name", () => {
    const html = renderToString(() => <ThemeProvider messages={{ empty: "Noch leer", noResults: "Keine Treffer" }}><EmptyState /><EmptyState kind="no-results" /></ThemeProvider>);
    expect(html).toContain("Noch leer");
    expect(html).toContain("Keine Treffer");
    const labels = Array.from(html.matchAll(/aria-labelledby="([^"]+)"/g), match => match[1]);
    expect(labels).toHaveLength(2);
    expect(new Set(labels).size).toBe(2);
    for (const label of labels) expect(html).toContain(`<strong id="${label}"`);
    expect(html).not.toMatch(/aria-live|autofocus|tabindex/);
  });
  it("preserves explicit names, descriptions, actions, and hidden state", () => {
    const html = renderToString(() => <ThemeProvider><EmptyState heading="No orders" description="Create an order." aria-label="Orders" hidden class="custom"><a href="/orders/new">Create</a></EmptyState></ThemeProvider>);
    expect(html).toContain('aria-label="Orders"');
    expect(html).not.toContain("aria-labelledby");
    expect(html).toContain("No orders");
    expect(html).toContain("Create an order.");
    expect(html).toContain('href="/orders/new"');
    expect(html).toContain("custom");
    expect(html).toMatch(/\bhidden(?:[ =>])/);
  });
});
