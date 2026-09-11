import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Center, Container, Grid, Row, Spacer, Stack } from "./Layout.tsx";
import type { GridProps, Spacing } from "./Layout.tsx";

describe("server-rendered layout primitives", () => {
  it("renders nested content, native attributes, and merged classes without browser globals", () => {
    const html = renderToString(() => <Container id="container" class="consumer" padding="lg" style={{ "max-inline-size": "100%" }}><Stack aria-label="Fields" gap="sm"><Row wrap={false}><span>First</span><Spacer /><span>Last</span></Row><Center>Centered</Center></Stack></Container>);
    expect(html).toMatch(/class="sheen-layout sheen-container consumer\s*"/);
    expect(html).toContain('id="container"');
    expect(html).toContain('aria-label="Fields"');
    expect(html).toContain('data-gap="lg"');
    expect(html).toContain('data-wrap="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Centered");
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Last"));
    expect(html).not.toContain("tabindex");
  });
  it("emits every supported spacing and grid column value", () => {
    const gaps: Spacing[] = ["none", "xs", "sm", "md", "lg", "xl"];
    for (const gap of gaps) expect(renderToString(() => <Stack gap={gap} />)).toContain(`data-gap="${gap}"`);
    const columns: NonNullable<GridProps["columns"]>[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    for (const count of columns) expect(renderToString(() => <Grid columns={count} />)).toContain(`data-columns="${count}"`);
  });
  it("has deterministic defaults and no initial mount animation attributes", () => {
    const html = renderToString(() => <Stack><Row /><Grid /><Container /></Stack>);
    expect(html).toContain('data-align="stretch"');
    expect(html).toContain('data-align="center"');
    expect(html).toContain('data-justify="start"');
    expect(html).toContain('data-wrap="true"');
    expect(html).toContain('data-columns="1"');
    expect(html).not.toContain("animation");
    expect(html).toBe(renderToString(() => <Stack><Row /><Grid /><Container /></Stack>));
  });
});
