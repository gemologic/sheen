import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Skeleton } from "./Skeleton.tsx";

describe("Skeleton SSR", () => {
  it("is decorative and inert even when native ARIA overrides are supplied", () => {
    const html = renderToString(() => <Skeleton aria-hidden={false} inert={false} />);
    expect(html).toContain('data-shape="text"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toMatch(/\binert(?:[ =>])/);
    expect(html).not.toMatch(/aria-live|role="status"/);
  });
  it("retains native sizing, classes, and hidden state across shapes", () => {
    for (const shape of ["text", "rectangle", "circle"] satisfies Array<"text" | "rectangle" | "circle">) {
      const html = renderToString(() => <Skeleton shape={shape} hidden class="custom" style={{ "inline-size": "40px" }} />);
      expect(html).toContain(`data-shape="${shape}"`);
      expect(html).toContain("custom");
      expect(html).toContain("inline-size:40px");
      expect(html).toMatch(/\bhidden(?:[ =>])/);
    }
  });
});
