import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { NavItem, NavList } from "./NavList.tsx";

describe("NavList SSR", () => {
  it("resolves icon and badge slots once while retaining native link semantics", () => {
    let icons = 0;
    let badges = 0;
    const Icon = () => { icons++; return <svg viewBox="0 0 16 16"><path d="M2 8h12" /></svg>; };
    const Badge = () => { badges++; return <span>3 unread</span>; };
    const html = renderToString(() => <NavList label="Workspace"><NavItem href="/inbox" label="Inbox" icon={<Icon />} badge={<Badge />} /></NavList>);
    expect(icons).toBe(1);
    expect(badges).toBe(1);
    expect(html).toContain('class="sheen-nav-item-icon" aria-hidden="true"');
    expect(html).toContain('href="/inbox"');
    expect(html).toContain("3 unread");
    expect(html).not.toContain("<button");
  });
  it("renders a named native link list with app-owned current state", () => {
    const html = renderToString(() => <NavList label="Workspace"><NavItem href="/overview" label="Overview" current /><NavItem href="/activity" label="Activity" target="_blank" rel="noopener" /></NavList>);
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Workspace"');
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('href="/overview"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('data-current="true"');
    expect(html).toContain('target="_blank"');
    expect(html).not.toContain('role="menu"');
    expect(html).toMatch(/<nav[^>]*tabindex="-1"/i);
    expect(html.match(/tabindex="-1"/gi)).toHaveLength(1);
    expect(html).not.toMatch(/tabindex="0"/i);
  });
  it("renders row actions beside rather than inside the native destination", () => {
    const html = renderToString(() => <NavList label="Workspace"><NavItem href="/activity" label="Activity" actions={<button type="button">Activity actions</button>} /></NavList>);
    expect(html).toContain('data-has-actions="true"');
    const linkStart = html.indexOf('href="/activity"');
    const linkEnd = html.indexOf("</a>", linkStart);
    const actionStart = html.indexOf("<button", linkStart);
    expect(linkStart).toBeGreaterThan(-1);
    expect(linkEnd).toBeGreaterThan(linkStart);
    expect(actionStart).toBeGreaterThan(linkEnd);
  });
  it("rejects orphan items and unnamed or destinationless navigation", () => {
    expect(() => renderToString(() => <NavItem href="/" label="Home" />)).toThrow("NavList owner");
    expect(() => renderToString(() => <NavList label=" " />)).toThrow("accessible label");
    expect(() => renderToString(() => <NavList label="Workspace"><NavItem href=" " label="Home" /></NavList>)).toThrow("href and label");
  });
});
