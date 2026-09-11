import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Tabs } from "./Tabs.tsx";

describe("Tabs SSR", () => {
  it("provides complete tab/panel associations and retains inactive panels", () => {
    const html = renderToString(() => <Tabs id="settings" label="Settings" items={[{ value: "one", label: "One" }, { value: "two", label: "Two" }]}>{value => <input value={value} />}</Tabs>);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('aria-controls="settings-one-panel"');
    expect(html).toContain('aria-labelledby="settings-one-tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('value="two"');
    expect(html).toContain("hidden");
  });
  it("validates item identities and labels", () => {
    expect(() => renderToString(() => <Tabs label="Settings" items={[{ value: "same", label: "One" }, { value: "same", label: "Two" }]}>{value => value}</Tabs>)).toThrow("duplicate item value");
    expect(() => renderToString(() => <Tabs label=" " items={[]}>{value => value}</Tabs>)).toThrow("accessible label");
    expect(() => renderToString(() => <Tabs label="Settings" value="missing" items={[{ value: "one", label: "One" }]}>{value => value}</Tabs>)).toThrow("controlled value");
  });
});
