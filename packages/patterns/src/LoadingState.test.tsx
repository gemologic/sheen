import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider, Skeleton } from "@gemologic/sheen";
import { LoadingState } from "./LoadingState.tsx";

describe("LoadingState SSR", () => {
  it("reserves cold layout without revealing a skeleton before hydration", () => {
    const html = renderToString(() => <ThemeProvider><LoadingState label="Orders" phase="cold" fallback={<Skeleton style={{ height: "200px" }} />}><input value="Existing draft" /></LoadingState></ThemeProvider>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('visibility:hidden');
    expect(html).toMatch(/class="sheen-loading-fallback"[^>]*aria-hidden="true"[^>]*inert/);
    expect(html).toMatch(/class="sheen-loading-content" hidden/);
    expect(html).toContain('value="Existing draft"');
  });
  it("retains refresh children and starts with the progress bar hidden", () => {
    let renders = 0;
    const Content = () => { renders++; return <p>Retained orders</p>; };
    const html = renderToString(() => <ThemeProvider><LoadingState label="Orders" phase="refresh" fallback={<Skeleton />}><Content /></LoadingState></ThemeProvider>);
    expect(renders).toBe(1);
    expect(html).toMatch(/class="sheen-loading-fallback" hidden/);
    expect(html).not.toMatch(/class="sheen-loading-content" hidden/);
    expect(html).toMatch(/class="sheen-loading-progress"[^>]*hidden/);
    expect(() => renderToString(() => <ThemeProvider><LoadingState label=" " phase="idle" fallback={null} /></ThemeProvider>)).toThrow("nonempty region label");
  });
});
