import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { Resizable, ResizableHandle, ResizablePanel } from "./Resizable.tsx";

describe("Resizable", () => {
  it("renders deterministic percentage geometry and labeled separator markup on the server", () => {
    const html = renderToString(() => <Resizable defaultSizes={[0.3, 0.7]}><ResizablePanel index={0} panelId="left">Left</ResizablePanel><ResizableHandle index={0} label="Resize left and right" /><ResizablePanel index={1} panelId="right">Right</ResizablePanel></Resizable>);
    expect(html).toContain('data-corvu-resizable-root=""');
    expect(html).toContain('aria-label="Resize left and right"');
    expect(html).toContain('role="separator"');
    expect(html).toContain('aria-valuenow="30"');
    expect(html).toContain("flex-basis:30%");
    expect(html).toContain("flex-basis:70%");
  });

  it("uses server-provided persistence state without reading a client global", () => {
    const html = renderToString(() => <Resizable persistence={{ initialSizes: [0.4, 0.6], save: () => {}, onError: () => {} }}><ResizablePanel index={0}>A</ResizablePanel><ResizableHandle index={0} label="Resize A and B" /><ResizablePanel index={1}>B</ResizablePanel></Resizable>);
    expect(html).toContain("flex-basis:40%");
    expect(html).toContain("flex-basis:60%");
  });

  it("rejects invalid geometry and unnamed handles", () => {
    expect(() => renderToString(() => <Resizable defaultSizes={[0.2, 0.2]}><ResizablePanel index={0}>A</ResizablePanel><ResizableHandle index={0} label="A and B" /><ResizablePanel index={1}>B</ResizablePanel></Resizable>)).toThrow("sum to one");
    expect(() => renderToString(() => <Resizable><ResizablePanel index={0}>A</ResizablePanel><ResizableHandle index={0} label=" " /><ResizablePanel index={1}>B</ResizablePanel></Resizable>)).toThrow("nonempty");
  });
});
