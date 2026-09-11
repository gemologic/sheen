import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Select } from "./Select.tsx";

const options = [{ value: "live", label: "Live" }, { value: "manual", label: "Manual" }];
describe("Select server contract", () => {
  it("renders labeled selected state and native form values without a body overlay", () => {
    const html = renderToString(() => <ThemeProvider><Select label="Cadence" name="cadence" options={options} defaultValue="manual" description="Update frequency" error="Choose another" required /></ThemeProvider>);
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('name="cadence"');
    expect(html).toMatch(/<select\b[^>]*id="[^"]+-native"/u);
    expect(html).toMatch(/<option[^>]*value="manual"[^>]*selected/);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain("Update frequency");
    const trigger = html.match(/<button\b[^>]*>/)?.[0] ?? "";
    const labels = trigger.match(/aria-labelledby="([^"]+)"/)?.[1]?.split(" ") ?? [];
    expect(labels).toHaveLength(2);
    for (const label of labels) expect(html).toContain(`id="${label}"`);
    expect(trigger).toContain("aria-describedby=");
    expect(html).not.toContain('class="sheen-select-content"');
  });
  it("honors explicit empty selection and rejects ambiguous values", () => {
    const html = renderToString(() => <ThemeProvider><Select label="Cadence" options={options} value={null} defaultValue="manual" /></ThemeProvider>);
    expect(html).toContain("Select an option");
    expect(html).not.toMatch(/<option[^>]*value="manual"[^>]*selected/);
    expect(() => renderToString(() => <ThemeProvider><Select label="Bad" options={[options[0]!, options[0]!]} /></ThemeProvider>)).toThrow("duplicate option value");
    expect(() => renderToString(() => <ThemeProvider><Select label="Bad" options={[{ value: "", label: "Empty" }]} /></ThemeProvider>)).toThrow("nonempty");
  });
});
