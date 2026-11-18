import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Heading, Prose, Text } from "./Typography.tsx";

describe("Prose and display type SSR", () => {
  it("keeps native article semantics inside the reading container", () => {
    const html = renderToString(() => <Prose id="article"><h2>Title</h2><p>Body <a href="/docs">link</a></p></Prose>);
    expect(html).toContain("sheen-prose");
    expect(html).toMatch(/<h2[^>]*>Title<\/h2>/);
    expect(html).toContain('href="/docs"');
  });
  it("renders display headings at their outline level and lead text", () => {
    const heading = renderToString(() => <Heading level={1} size="display-1">Ship faster</Heading>);
    expect(heading).toMatch(/^<h1[^>]*data-size="display-1"/);
    expect(renderToString(() => <Text size="lead">Lead</Text>)).toContain('data-size="lead"');
  });
});
