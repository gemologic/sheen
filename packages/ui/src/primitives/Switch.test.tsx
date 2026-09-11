import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Switch } from "./Switch.tsx";

describe("Switch server contract", () => {
  it("renders a labeled native input with switch semantics and validation", () => {
    const html = renderToString(() => <Switch label="Live updates" name="live" value="enabled" defaultChecked description="Automatic refresh" error="Connection unavailable" />);
    expect(html).toContain('role="switch"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="live"');
    expect(html).toContain('value="enabled"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Live updates");
    expect(html).toContain("Connection unavailable");
    expect(html).not.toContain("aria-live");
  });
  it("keeps controlled precedence and does not submit generated names", () => {
    const html = renderToString(() => <Switch label="Readonly setting" checked={false} defaultChecked readOnly disabled />);
    const input = html.match(/<input\b[^>]*>/)?.[0];
    expect(input).toContain('name=""');
    expect(input).not.toMatch(/\schecked(?:[ =>])/);
    expect(input).toMatch(/\bdisabled(?:[ =>])/);
    expect(input).toContain('aria-readonly="true"');
  });
});
