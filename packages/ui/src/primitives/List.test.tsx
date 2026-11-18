import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { List, ListItem } from "./List.tsx";

describe("List SSR", () => {
  it("renders link, action, and static rows with complete server markup", () => {
    const html = renderToString(() => <List label="Incidents" dividers inset>
      <ListItem href="/incidents/42" current title="INC-42" description="Investigating" trailing="SEV2" />
      <ListItem onSelect={() => {}} selected title="INC-41" />
      <ListItem title="INC-40" disabled />
    </List>);
    expect(html).toContain('role="list"');
    expect(html).toContain('aria-label="Incidents"');
    expect(html).toContain("data-dividers");
    expect(html).toContain('href="/incidents/42"');
    expect(html).toContain('aria-current="page"');
    expect(html).toMatch(/<button[^>]*class="sheen-list-item-row"/);
    expect(html).toContain("data-selected");
    expect(html.match(/data-interactive/g)).toHaveLength(2);
    expect(html).toContain("Investigating");
    expect(html).toContain("SEV2");
  });
  it("evaluates JSX slots once so hydration finds one node per slot", () => {
    let renders = 0;
    const trailing = () => { renders++; return <span>SEV2</span>; };
    renderToString(() => <List label="Incidents"><ListItem href="/incidents/42" title="Latency" trailing={trailing()} /></List>);
    expect(renders).toBe(1);
  });
});
