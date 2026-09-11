import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "@gemologic/sheen";
import { AppShell } from "./AppShell.tsx";
import { ListDetailLayout, resolveListDetailActive } from "./ListDetailLayout.tsx";
import type { ListDetailItem } from "./ListDetailLayout.tsx";
import type { RouterAdapter, RouterLocation } from "./router.ts";

const listLocation: RouterLocation = { entryKey: "list", pathname: "/inbox", search: "", hash: "" };
const firstLocation: RouterLocation = { entryKey: "first", pathname: "/inbox", search: "?item=first", hash: "" };
const nestedLocation: RouterLocation = { entryKey: "nested", pathname: "/projects/one/settings", search: "", hash: "" };
const items: readonly ListDetailItem[] = [
  { id: "first", label: "First message", href: "/inbox?item=first", description: "Unread" },
  { id: "project", label: "Project", href: "/projects/one", match: "prefix" },
];

function router(location: RouterLocation): RouterAdapter {
  return { location: () => location, navigate: () => {}, block: () => () => {} };
}

describe("ListDetailLayout", () => {
  it("resolves exact query destinations and the longest path prefix from accepted router state", () => {
    expect(resolveListDetailActive(items, listLocation)).toBeNull();
    expect(resolveListDetailActive(items, firstLocation)).toBe("first");
    expect(resolveListDetailActive(items, nestedLocation)).toBe("project");
  });

  it("renders both persistent panes on the server and selects only the accepted URL", () => {
    const adapter = router(firstLocation);
    const html = renderToString(() => <ThemeProvider><AppShell label="Inbox" router={adapter}><ListDetailLayout router={adapter} items={items}
      listLabel="Messages" detailLabel="Message detail" listHref="/inbox" backLabel="Back to messages" detail={<article>Accepted detail</article>} emptyDetail={<p>Select a message</p>} /></AppShell></ThemeProvider>);
    expect(html).toContain('data-active-detail=""');
    expect(html).toContain('data-active-id="first"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Messages"');
    expect(html).toContain('aria-label="Message detail"');
    expect(html).toContain("First message");
    expect(html).toContain("Accepted detail");
    expect(html).not.toContain("Select a message");
  });

  it("fails closed on unstable IDs, blank labels, and remote hrefs", () => {
    expect(() => resolveListDetailActive([{ id: "same", label: "One", href: "/one" }, { id: "same", label: "Two", href: "/two" }], listLocation)).toThrow("unique");
    expect(() => resolveListDetailActive([{ id: "blank", label: " ", href: "/one" }], listLocation)).toThrow("label");
    expect(() => resolveListDetailActive([{ id: "remote", label: "Remote", href: "https://example.com" }], listLocation)).toThrow("local absolute");
  });
});
