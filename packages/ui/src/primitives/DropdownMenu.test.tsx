import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { DropdownMenu } from "./DropdownMenu.tsx";
import type { MenuItem } from "./DropdownMenu.tsx";

const action: MenuItem = { kind: "action", id: "save", label: "Save", onSelect: () => {} };
const render = (items: readonly MenuItem[]) => renderToString(() => <ThemeProvider><DropdownMenu trigger="Actions" items={items} /></ThemeProvider>);
describe("DropdownMenu server contract", () => {
  it("renders a native menu trigger without escaping to an SSR body portal", () => {
    const html = render([action]);
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toContain('aria-haspopup="true"');
    expect(html).toContain("Actions");
    expect(html).not.toContain('role="menu"');
  });
  it("accepts composite trigger content, an explicit name, and logical placement", () => {
    const html = renderToString(() => <ThemeProvider><DropdownMenu trigger={<><span aria-hidden="true">●</span><span>Account</span></>} triggerLabel="Account menu" placement="top-end" items={[action]} /></ThemeProvider>);
    expect(html).toContain('aria-label="Account menu"');
    expect(html).toContain("Account");
    expect(html).not.toContain("top-end");
  });
  it("does not instantiate lazy item icons while closed server content is omitted", () => {
    let iconCalls = 0;
    render([{ ...action, icon: () => { iconCalls += 1; return <span>Save icon</span>; } }]);
    expect(iconCalls).toBe(0);
  });
  it("validates the whole tree even while closed", () => {
    expect(() => render([action, action])).toThrow("duplicate sibling ID");
    expect(() => render([{ ...action, id: " " }])).toThrow("nonempty");
    expect(() => render([{ ...action, label: " " }])).toThrow("labels");
    expect(() => render([{ kind: "submenu", id: "sub", label: "More", items: [action, action] }])).toThrow("duplicate sibling ID");
    expect(() => render([{ kind: "radio", id: "sort", label: "Sort", value: "a", onValueChange: () => {}, options: [{ id: "a", label: "A" }, { id: "a", label: "B" }] }])).toThrow("duplicate sibling ID");
  });
  it("allows repeated IDs in separate submenus but rejects cycles", () => {
    expect(() => render([action, { kind: "submenu", id: "sub", label: "More", items: [action] }])).not.toThrow();
    const cycle: MenuItem[] = [];
    cycle.push({ kind: "submenu", id: "sub", label: "More", items: cycle });
    expect(() => render(cycle)).toThrow("cyclic");
  });
  it("validates optional item descriptions", () => {
    expect(() => render([{ kind: "radio", id: "workspace", label: "Workspace", value: "forge", onValueChange: () => {}, options: [{ id: "forge", label: "Forge", description: " " }] }])).toThrow("descriptions");
  });
});
