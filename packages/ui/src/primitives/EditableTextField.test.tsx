import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { EditableTextField } from "./EditableTextField.tsx";

describe("EditableTextField", () => {
  it("server-renders the committed value as a focusable non-form control", () => {
    let commits = 0;
    const html = renderToString(() => <ThemeProvider><form><EditableTextField value="North star" label="Project name" onCommit={() => { commits += 1; }} /></form></ThemeProvider>);
    expect(html).toContain('role="button"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("North star");
    expect(html).not.toContain("<input");
    expect(commits).toBe(0);
  });

  it("server-renders disabled and empty states without entering edit mode", () => {
    const html = renderToString(() => <ThemeProvider><EditableTextField value="" emptyLabel="Add name" label="Project name" disabled onCommit={() => {}} /></ThemeProvider>);
    expect(html).toContain("Add name");
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toContain('tabindex="0"');
  });
});
