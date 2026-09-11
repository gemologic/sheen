import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { DynamicIcon, createStaticIcon } from "./runtime.tsx";
import { iconData } from "./generated/catalog.ts";
import { iconNames } from "./registry.ts";

describe("icon runtime", () => {
  it("renders both selected glyphs without duplicating accessibility content", () => {
    const SearchIcon = createStaticIcon("search", iconData.search);
    const html = renderToString(() => <SearchIcon id="query-icon" class="fixture" size="lg" />);

    expect(html).toContain('id="query-icon"');
    expect(html).toMatch(/class="sheen-icon fixture\s*"/);
    expect(html).toContain('data-size="lg"');
    expect(html).toContain('aria-hidden="true"');
    expect(html.match(/<svg\b/g)).toHaveLength(2);
    expect(html).toContain('viewBox="0 0 15 15"');
    expect(html).toContain('viewBox="0 0 256 256"');
    expect(html).toContain('data-sheen-icon-set-value="radix"');
    expect(html).toContain('data-sheen-icon-set-value="phosphor"');
  });

  it("gives a meaningful icon one accessible name and rejects an empty one", () => {
    const html = renderToString(() => <DynamicIcon name="warning" decorative={false} label="Review warning" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Review warning"');
    expect(html).not.toMatch(/<span[^>]*aria-hidden=/);
    expect(() => renderToString(() => <DynamicIcon name="warning" decorative={false} label=" " />)).toThrow("requires a nonempty label");
  });

  it("keeps the dynamic registry explicit and complete", () => {
    expect(iconNames).toHaveLength(42);
    expect(new Set(iconNames)).toHaveLength(42);
    for (const name of iconNames) expect(iconData[name].map(icon => icon.set)).toEqual(["radix", "phosphor"]);
    expect(() => renderToString(() => <DynamicIcon name="not-a-sheen-icon" />)).toThrow("Unknown semantic icon");
  });

  it("rejects duplicate or empty static icon data", () => {
    const first = iconData.search.at(0);
    if (!first) throw new Error("generated search icon data is empty");
    expect(() => createStaticIcon("search", [])).toThrow("one unique entry");
    expect(() => createStaticIcon("search", [first, first])).toThrow("one unique entry");
  });
});
