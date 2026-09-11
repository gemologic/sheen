import { Button, ThemeProvider } from "@gemologic/sheen";
import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { AuthLayout, BrandSplitAuthLayout, FocusedAuthLayout } from "./AuthLayout.tsx";

describe("AuthLayout", () => {
  it("renders complete focused server markup and resolves every slot once", () => {
    let brands = 0;
    let content = 0;
    let footers = 0;
    const Brand = () => { brands += 1; return <a href="/">Northstar</a>; };
    const Content = () => { content += 1; return <Button>Continue with SSO</Button>; };
    const Footer = () => { footers += 1; return <a href="/support">Support</a>; };
    const html = renderToString(() => <ThemeProvider><AuthLayout label="Sign in" brand={<Brand />} footer={<Footer />}><Content /></AuthLayout></ThemeProvider>);
    expect(html).toContain("<main");
    expect(html).toContain('aria-label="Sign in"');
    expect(html).toContain('data-presentation="focused"');
    expect(html).toContain("Continue with SSO");
    expect(html).toContain("<footer");
    expect(html).not.toContain("<aside");
    expect({ brands, content, footers }).toEqual({ brands: 1, content: 1, footers: 1 });
  });

  it("keeps form-first DOM order while placing a labeled brand region logically", () => {
    const html = renderToString(() => <ThemeProvider><BrandSplitAuthLayout brand={<strong>Northstar</strong>} title="Sign in" description="Use your work account."
      aside={<blockquote>One calm workspace.</blockquote>} asideLabel="Product context" asidePosition="end"><input aria-label="Work email" /></BrandSplitAuthLayout></ThemeProvider>);
    expect(html).toContain('data-presentation="brand-split"');
    expect(html).toContain('data-aside-position="end"');
    expect(html).toContain('aria-label="Product context"');
    expect(html).toContain("<h1");
    expect(html).toContain("Use your work account.");
    expect(html.indexOf("Work email")).toBeLessThan(html.indexOf("One calm workspace."));
  });

  it("renders the focused convenience layout with a semantic heading", () => {
    const html = renderToString(() => <ThemeProvider><FocusedAuthLayout brand={<strong>Northstar</strong>} title="Welcome back" headingLevel={2}><Button>Continue</Button></FocusedAuthLayout></ThemeProvider>);
    expect(html).toContain('class="sheen-auth-layout sheen-focused-auth-layout');
    expect(html).toContain("<h2");
    expect(html).toContain("Welcome back");
    expect(html).toContain('data-content-width="sm"');
  });

  it("rejects ambiguous or inaccessible layout contracts", () => {
    expect(() => renderToString(() => <AuthLayout label=" " brand="Brand">Content</AuthLayout>)).toThrow("nonempty label");
    expect(() => renderToString(() => <BrandSplitAuthLayout brand="Brand" title="Sign in" aside="Context" asideLabel=" ">Content</BrandSplitAuthLayout>)).toThrow("nonempty asideLabel");
    expect(() => renderToString(() => <FocusedAuthLayout brand="Brand" title=" ">Content</FocusedAuthLayout>)).toThrow("nonempty title");
  });
});
