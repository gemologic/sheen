import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { SearchInput } from "./SearchInput.tsx";

describe("SearchInput SSR", () => {
  it("renders controlled query and localized clear action with no effects", () => {
    const html = renderToString(() => <ThemeProvider messages={{ clearSearch: "Suche leeren" }}><SearchInput label="Orders" value="BTC" defaultValue="Ignored" onValueChange={() => { throw new Error("SSR must not emit changes"); }} /></ThemeProvider>);
    expect(html).toContain('type="search"');
    expect(html).toContain('value="BTC"');
    expect(html).not.toContain("Ignored");
    expect(html).toContain("Suche leeren");
    expect(html).toMatch(/class="[^"]*sheen-search-input-clear/);
    expect(html).toContain('class="sheen-search-input-indicator" aria-hidden="true"');
    expect(html.match(/<label\b/g)).toHaveLength(1);
  });
  it("disables clearing for empty, disabled, and readonly searches", () => {
    for (const props of [{}, { defaultValue: "BTC", disabled: true }, { defaultValue: "BTC", readOnly: true }]) {
      const html = renderToString(() => <ThemeProvider><SearchInput label="Orders" {...props} /></ThemeProvider>);
      expect(html).toMatch(/<button\b[^>]*\bdisabled/);
    }
  });
  it("keeps optional shortcut metadata out of native attributes", () => {
    const html = renderToString(() => <ThemeProvider><SearchInput label="Orders" shortcut={{ keys: "mod+f", label: "Search orders", group: "Tables" }} /></ThemeProvider>);
    expect(html).not.toContain("mod+f");
    expect(html).not.toContain("[object Object]");
  });
});
