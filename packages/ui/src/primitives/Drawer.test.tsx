import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Drawer, Sheet } from "./Drawer.tsx";

describe("Drawer and Sheet SSR", () => {
  it("render native dialog triggers without mounting client-only panels", () => {
    const html = renderToString(() => <ThemeProvider><Drawer title="Filters" trigger="Open filters" side="start" /><Sheet title="Details" trigger="Open details" /></ThemeProvider>);
    expect(html.match(/<button\b/g)).toHaveLength(2);
    expect(html.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(html).not.toContain("sheen-drawer");
  });
});
