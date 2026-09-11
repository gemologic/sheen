import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { createToaster } from "./create-toaster.ts";
import { Toaster } from "./Toaster.tsx";

describe("Toaster server boundary", () => {
  it("rejects multiple presenters sharing one queue", () => {
    expect(() => renderToString(() => {
      const notices = createToaster();
      return <ThemeProvider><Toaster controller={notices} /><Toaster controller={notices} /></ThemeProvider>;
    })).toThrow("only one Toaster");
  });
  it("does not escape its unavailable scoped portal or create server timers", () => {
    const html = renderToString(() => {
      const notices = createToaster();
      notices.show({ title: "Queued on owner", duration: 100 });
      return <ThemeProvider><Toaster controller={notices} /></ThemeProvider>;
    });
    expect(html).not.toContain("Queued on owner");
    expect(html).not.toContain('role="region"');
    expect(html).toContain('data-sheen-portal="root"');
  });
  it("rejects invalid limits even before the portal exists", () => {
    for (const limit of [0, -1, 1.5, Infinity]) {
      expect(() => renderToString(() => {
        const notices = createToaster();
        return <ThemeProvider><Toaster controller={notices} limit={limit} /></ThemeProvider>;
      })).toThrow("positive integer");
    }
  });
});
