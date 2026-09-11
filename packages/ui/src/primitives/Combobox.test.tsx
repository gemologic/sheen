import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Combobox, MultiCombobox } from "./Combobox.tsx";

const options = [{ value: "ada", label: "Ada" }, { value: "grace", label: "Grace", description: "Compiler pioneer" }];

describe("Combobox server contract", () => {
  it("renders a labeled editable control and native form field without an overlay", () => {
    const html = renderToString(() => <ThemeProvider><Combobox label="Owner" name="owner" form="workspace" options={options} defaultValue="ada" description="Choose an owner" required /></ThemeProvider>);
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('name="owner"');
    expect(html).toContain('form="workspace"');
    expect(html).toContain("Choose an owner");
    expect(html).not.toContain("sheen-combobox-content");
  });

  it("renders ordered multi-select form values and selected tags", () => {
    const html = renderToString(() => <ThemeProvider><MultiCombobox label="Owners" name="owners" options={options} defaultValue={["ada", "grace"]} /></ThemeProvider>);
    expect(html).toMatch(/<select\b[^>]*\bmultiple\b/);
    expect(html).toContain("Ada");
    expect(html).toContain("Grace");
    expect(html).toContain("Remove Ada");
    expect(html).toContain("Remove Grace");
  });

  it("rejects ambiguous option and selection state", () => {
    expect(() => renderToString(() => <ThemeProvider><Combobox label="Bad" options={[options[0]!, options[0]!]} /></ThemeProvider>)).toThrow("duplicate option value");
    expect(() => renderToString(() => <ThemeProvider><Combobox label="Bad" options={[{ value: "", label: "Bad" }]} /></ThemeProvider>)).toThrow("option values must be nonempty");
    expect(() => renderToString(() => <ThemeProvider><Combobox label="Bad" options={[{ value: "bad", label: " " }]} /></ThemeProvider>)).toThrow("option labels must be nonempty");
    expect(() => renderToString(() => <ThemeProvider><Combobox label="Bad" options={options} value="missing" /></ThemeProvider>)).toThrow("has not appeared in options");
    expect(() => renderToString(() => <ThemeProvider><MultiCombobox label="Bad" options={options} value={["ada", "ada"]} /></ThemeProvider>)).toThrow("duplicate selected value");
  });
});
