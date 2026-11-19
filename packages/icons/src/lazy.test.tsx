import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { LazyIcon, isLazyIconName, preloadIcons } from "./lazy.tsx";
import { isLucideIconAlias, lucideIconAliases, resolveLucideIconName } from "./lucide.ts";
import { iconNames, isIconName } from "./registry.ts";

describe("lazy icon loader", () => {
  it("renders a sized placeholder for a name that has not been preloaded", () => {
    const html = renderToString(() => <LazyIcon id="lazy" name="gitMerge" size="lg" decorative={false} label="Merged" />);
    expect(html).toContain('data-sheen-icon="gitMerge"');
    expect(html).toContain('data-sheen-icon-state="loading"');
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('aria-label="Merged"');
    expect(html).not.toContain("<svg");
  });

  it("renders the resolved glyphs on the server once the name is preloaded", async () => {
    await preloadIcons(["terminal", "not-a-sheen-icon", "terminal"]);
    const html = renderToString(() => <LazyIcon name="terminal" />);
    expect(html).not.toContain("data-sheen-icon-state");
    expect(html).toContain('data-sheen-icon-set-value="radix"');
    expect(html).toContain('data-sheen-icon-set-value="phosphor"');
    expect(html.match(/<svg\b/g)).toHaveLength(2);
  });

  it("marks unknown and inherited object names visibly without throwing", () => {
    for (const name of ["not-a-sheen-icon", "constructor", "__proto__", 'x" onmouseover="alert(1)']) {
      expect(isLazyIconName(name)).toBe(false);
      const html = renderToString(() => <LazyIcon name={name} />);
      expect(html).toContain('data-sheen-icon-state="unknown"');
      expect(html).not.toContain("<svg");
      expect(html).not.toContain('" onmouseover="');
    }
  });

  it("has a loader for exactly the registry names", () => {
    expect(iconNames.every(isLazyIconName)).toBe(true);
  });
});

describe("lucide aliases", () => {
  it("maps lucide kebab-case names onto real semantic names", () => {
    const entries = Object.entries(lucideIconAliases);
    expect(entries.length).toBeGreaterThan(250);
    for (const [alias, name] of entries) {
      expect(alias).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
      expect(isIconName(name)).toBe(true);
    }
    expect(resolveLucideIconName("x")).toBe("close");
    expect(resolveLucideIconName("trash-2")).toBe("trash");
    expect(resolveLucideIconName("triangle-alert")).toBe("warning");
  });

  it("returns undefined for names without a Sheen intent", () => {
    expect(resolveLucideIconName("loader-circle")).toBeUndefined();
    expect(resolveLucideIconName("toString")).toBeUndefined();
    expect(isLucideIconAlias("hasOwnProperty")).toBe(false);
  });
});
