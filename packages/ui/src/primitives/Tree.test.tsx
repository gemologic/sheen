import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ThemeProvider } from "../theme/ThemeProvider.tsx";
import { Tree, TreeItem } from "./Tree.tsx";

describe("Tree server contract", () => {
  it("renders complete retained hierarchy, one roving tab stop, and distinct selection", () => {
    const html = renderToString(() => <ThemeProvider><Tree label="Workspace" selectionMode="multiple" defaultSelectedValues={["readme"]} defaultExpandedValues={["src"]}>
      <TreeItem value="src" label="Source"><TreeItem value="app" label="App" /><TreeItem value="tests" label="Tests" /></TreeItem>
      <TreeItem value="readme" label="README" />
      <TreeItem value="archive" label="Archive"><TreeItem value="old" label="Old" /></TreeItem>
    </Tree></ThemeProvider>);
    expect(html).toContain('role="tree"');
    expect(html).toContain('aria-label="Workspace"');
    expect(html).toContain('aria-multiselectable="true"');
    expect(html.match(/role="treeitem"/gu)).toHaveLength(6);
    expect(html.match(/tabIndex="0"/gu)).toHaveLength(1);
    expect(html).toContain('data-sheen-tree-value="src"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('data-sheen-tree-value="archive"');
    expect(html).toContain("hidden");
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Old");
  });

  it("rejects ambiguous identities and invalid selection modes", () => {
    expect(() => renderToString(() => <ThemeProvider><Tree label="Duplicate"><TreeItem value="same" label="One" /><TreeItem value="same" label="Two" /></Tree></ThemeProvider>)).toThrow("duplicate item value");
    expect(() => renderToString(() => <ThemeProvider><Tree label="Single" selectedValues={["one", "two"]}><TreeItem value="one" label="One" /></Tree></ThemeProvider>)).toThrow("at most one");
    expect(() => renderToString(() => <ThemeProvider><Tree label="None" selectionMode="none" selectedValues={["one"]}><TreeItem value="one" label="One" /></Tree></ThemeProvider>)).toThrow("cannot contain");
    expect(() => renderToString(() => <ThemeProvider><Tree label="Invalid"><TreeItem value=" " label="Blank" /></Tree></ThemeProvider>)).toThrow("nonempty");
  });
});
