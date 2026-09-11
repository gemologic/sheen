import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { PageHeader } from "./PageHeader.tsx";

describe("PageHeader SSR", () => {
  it("renders a named group with the chosen heading level and single-evaluation slots", () => {
    let renders = 0;
    const Actions = () => { renders++; return <button>Export</button>; };
    const html = renderToString(() => <PageHeader title="Orders" headingLevel={2} breadcrumb={<nav aria-label="Breadcrumb">Home</nav>} actions={<Actions />} tabs={<div role="tablist" aria-label="Views">Tabs</div>} />);
    expect(renders).toBe(1);
    expect(html).toContain('role="group"');
    expect(html).toMatch(/<h2[^>]*>.*Orders.*<\/h2>/s);
    const id = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain("sheen-page-header-breadcrumb");
    expect(html).toContain("sheen-page-header-actions");
    expect(html).toContain("sheen-page-header-tabs");
    expect(html).not.toContain("<header");
  });
  it("omits unused slots, forwards native attributes, and rejects blank titles", () => {
    const html = renderToString(() => <PageHeader title="Orders" hidden data-owner="app" />);
    expect(html).not.toContain("sheen-page-header-actions");
    expect(html).not.toContain("sheen-page-header-breadcrumb");
    expect(html).not.toContain("sheen-page-header-tabs");
    expect(html).toContain('data-owner="app"');
    expect(html).toMatch(/\bhidden(?:[ =>])/);
    expect(() => renderToString(() => <PageHeader title=" " />)).toThrow("nonempty title");
  });
});
