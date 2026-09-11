import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Code, Heading, Kbd, Text } from "./Typography.tsx";
import type { HeadingProps } from "./Typography.tsx";
import { Badge, Tag } from "./Status.tsx";
import type { StatusTone } from "./Status.tsx";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";

describe("typography and status SSR", () => {
  it("uses semantic elements and separates heading level from visual size", () => {
    const levels: HeadingProps["level"][] = [1, 2, 3, 4, 5, 6];
    for (const level of levels) {
      const html = renderToString(() => <Heading level={level} size="h4" id="section">Settings</Heading>);
      expect(html).toMatch(new RegExp(`^<h${level}\\b`));
      expect(html).toContain('data-size="h4"');
      expect(html).toContain('id="section"');
    }
    const html = renderToString(() => <Text tone="muted" numeric class="custom"><Code>{"<script>"}</Code><Kbd aria-label="Control K">Ctrl K</Kbd></Text>);
    expect(html).toContain('data-numeric="true"');
    expect(html).toContain('data-tone="muted"');
    expect(html).toContain("custom");
    expect(html).toContain("<code");
    expect(html).toContain("&lt;script>");
    expect(html).toContain("<kbd");
    expect(html).toContain('aria-label="Control K"');
  });
  it("renders all status roles without inventing interactive or live-region semantics", () => {
    const tones: StatusTone[] = ["neutral", "accent", "info", "success", "warning", "danger", "market-up", "market-down", "market-flat"];
    for (const tone of tones) {
      const html = renderToString(() => <Badge tone={tone}>Status text</Badge>);
      expect(html).toContain(`data-tone="${tone}"`);
      expect(html).toContain('data-variant="soft"');
      expect(html).not.toMatch(/tabindex|role=|aria-live/);
    }
  });
  it("localizes optional tag removal and retains app-owned state", () => {
    const html = renderToString(() => <ThemeProvider messages={{ remove: "Entfernen" }}><Tag label="Review" onRemove={() => { throw new Error("SSR must not activate removal"); }} disabled /><Tag label="Static" /></ThemeProvider>);
    expect(html).toContain('aria-label="Entfernen Review"');
    expect(html).toContain("disabled");
    expect(html.match(/<button\b/g)).toHaveLength(1);
    expect(html).toContain("Static");
    expect(html).toContain("Review");
  });
});
