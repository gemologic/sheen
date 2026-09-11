import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Surface, Card } from "./Surface.tsx";
import { Alert, Callout } from "./Notice.tsx";
import { Separator } from "./Separator.tsx";

describe("surface and notice SSR", () => {
  it("retains native attributes, content, and explicit card overrides", () => {
    const html = renderToString(() => <Surface variant="inset" padding="sm" class="custom"><Card variant="base" padding="none" bordered={false} elevated id="card">Content</Card></Surface>);
    expect(html).toContain('data-surface="inset"');
    expect(html).toContain('data-surface="base"');
    expect(html).toContain('data-gap="none"');
    expect(html).toContain('data-elevated="true"');
    expect(html).not.toContain("data-bordered");
    expect(html).toContain('id="card"');
    expect(html).toContain("custom");
    expect(html).toContain("Content");
  });
  it("defaults cards to quiet raised borders with no shadow", () => {
    const html = renderToString(() => <Card>Details</Card>);
    expect(html).toContain('data-surface="raised"');
    expect(html).toContain('data-bordered="true"');
    expect(html).toContain('data-gap="lg"');
    expect(html).not.toContain("data-elevated");
  });
  it("distinguishes urgent alerts from static callouts without focus side effects", () => {
    const alert = renderToString(() => <Alert heading="Save failed">Draft retained</Alert>);
    const note = renderToString(() => <Callout heading="Read this">Helpful details</Callout>);
    expect(alert).toContain('role="alert"');
    expect(alert).toContain('aria-atomic="true"');
    expect(alert).toContain('data-tone="danger"');
    expect(note).toContain('role="note"');
    expect(note).toContain('data-tone="info"');
    expect(note).not.toContain("aria-live");
    expect(alert + note).not.toMatch(/autofocus|tabindex/);
  });
  it("renders semantic and decorative separators with explicit orientation", () => {
    const semantic = renderToString(() => <Separator orientation="vertical" aria-label="Sections" />);
    expect(semantic).toMatch(/^<hr\b/);
    expect(semantic).toContain('data-orientation="vertical"');
    expect(semantic).toContain('aria-orientation="vertical"');
    expect(semantic).toContain('aria-label="Sections"');
    expect(semantic).not.toContain("aria-hidden");
    expect(renderToString(() => <Separator decorative />)).toContain('aria-hidden="true"');
  });
});
