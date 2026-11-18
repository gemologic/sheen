import { Button, Link, ThemeProvider } from "@gemologic/sheen";
import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import type { JSX } from "solid-js";
import { CtaBand, Faq, FeatureGrid, Hero, LogoCloud, PlanCard, PricingTable, SiteFooter, SiteHeader, Testimonial } from "./marketing.ts";
import type { PricingPeriod, PricingPlan } from "./marketing.ts";

const render = (view: () => JSX.Element, locale = "en-US"): string => renderToString(() => <ThemeProvider locale={locale}>{view()}</ThemeProvider>);
const periods: readonly PricingPeriod[] = [{ value: "month", label: "Monthly", suffix: "/ month" }, { value: "year", label: "Yearly", suffix: "/ year" }];
const plans: readonly PricingPlan[] = [
  { id: "team", name: "Team", prices: { month: 29, year: 290.5 }, features: ["Unlimited projects"], action: <Link href="/signup?plan=team" variant="button">Start with Team</Link> },
  { id: "scale", name: "Scale", priceLabel: "Custom", highlighted: true, badge: "Popular", features: ["SSO"], action: <Link href="/contact" variant="button">Contact sales</Link> },
];

describe("marketing patterns SSR", () => {
  it("renders a complete banner with a collapsed phone disclosure and single-evaluation slots", () => {
    let actions = 0;
    const Actions = () => { actions += 1; return <Link href="/sign-in">Sign in</Link>; };
    const html = render(() => <SiteHeader brand={<a href="/">Northstar</a>} links={[{ href: "/features", label: "Features" }, { href: "/pricing", label: "Pricing", current: true }]} actions={<Actions />} />);
    expect(actions).toBe(1);
    expect(html).toContain("<header");
    expect(html).toContain('data-menu-open="false"');
    expect(html).toMatch(/<nav[^>]*aria-label="Main"/u);
    expect(html).toMatch(/<a[^>]*href="\/pricing"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/pricing"/u);
    const controls = html.match(/aria-controls="([^"]+)"/u)?.[1];
    expect(controls).toBeTruthy();
    expect(html).toContain(`id="${controls}"`);
    expect(html).toContain('aria-expanded="false"');
    expect(() => render(() => <SiteHeader brand="N" links={[{ href: "/a", label: "A" }, { href: "/a", label: "B" }]} />)).toThrow("duplicate link href");
  });

  it("renders the hero as a labelled section with its heading level and media state", () => {
    const html = render(() => <Hero eyebrow="Beta" title="Ship calm interfaces" lead={<p>Lead copy.</p>} actions={<Button>Try it</Button>} media={<img src="/shot.png" alt="Product screenshot" />} />);
    const id = html.match(/<section[^>]*aria-labelledby="([^"]+)"/u)?.[1];
    expect(id).toBeTruthy();
    expect(html).toMatch(new RegExp(`<h1[^>]*id="${id}"`, "u"));
    expect(html).toContain('data-media="true"');
    expect(html).toContain("Lead copy.");
    expect(render(() => <Hero title="Plain" headingLevel={2} />)).toContain('data-media="false"');
    expect(() => render(() => <Hero title=" " />)).toThrow("nonempty title");
  });

  it("renders feature items one heading level below the section and rejects duplicate IDs", () => {
    const html = render(() => <FeatureGrid title="Features" columns={4} headingLevel={3} items={[{ id: "a", title: "Fast", description: "Quick.", icon: <svg /> }, { id: "b", title: "Small", description: "Tiny." }]} />);
    expect(html).toContain('data-columns="4"');
    expect(html).toMatch(/<h3[^>]*>Features<\/h3>/u);
    expect(html.match(/<h4/gu)?.length).toBe(2);
    expect(html.match(/sheen-feature-grid-icon/gu)?.length).toBe(1);
    expect(() => render(() => <FeatureGrid title="F" items={[{ id: "a", title: "A", description: "" }, { id: "a", title: "B", description: "" }]} />)).toThrow("duplicate item ID");
  });

  it("creates inline item JSX once so server and hydration markup agree", () => {
    let icons = 0;
    let logos = 0;
    const Icon = () => { icons += 1; return <svg />; };
    const Logo = () => { logos += 1; return <svg />; };
    render(() => <FeatureGrid title="F" items={[{ id: "a", title: "A", description: "d", icon: <Icon /> }]} />);
    render(() => <LogoCloud label="L" items={[{ id: "a", name: "A", logo: <Logo /> }]} />);
    expect({ icons, logos }).toEqual({ icons: 1, logos: 1 });
  });

  it("formats plan prices with the scoped locale and shows the toggle only for multiple periods", () => {
    const english = render(() => <PricingTable title="Pricing" currency="USD" periods={periods} plans={plans} />);
    expect(english).toContain("$29");
    expect(english).not.toContain("$29.00");
    expect(english).toContain("/ month");
    expect(english).toContain("Custom");
    expect(english).toContain('type="radio"');
    expect(english).toContain("Billing period");
    expect(english).toContain('data-highlighted="true"');
    expect(english).toContain("Popular");
    const yearly = render(() => <PricingTable title="Pricing" currency="EUR" periods={periods} defaultPeriod="year" plans={plans} />, "de-DE");
    expect(yearly).toContain("290,50 €");
    expect(yearly).toContain("/ year");
    const single = render(() => <PricingTable title="Pricing" currency="USD" periods={[periods[0] ?? { value: "month", label: "Monthly", suffix: "/ month" }]} plans={plans} />);
    expect(single).not.toContain('type="radio"');
    expect(() => render(() => <PricingTable title="Pricing" currency="USD" periods={periods} plans={[{ id: "x", name: "X", prices: { month: 1 }, features: [], action: <span /> }]} defaultPeriod="year" />)).toThrow("no price for period year");
  });

  it("requires a numeric price with currency or an explicit price label", () => {
    expect(render(() => <PlanCard name="Free" priceLabel="Free" features={["One project"]} action={<Button>Choose</Button>} />)).toContain("Free");
    expect(() => render(() => <PlanCard name="Team" features={[]} action={<Button>Choose</Button>} />)).toThrow("finite nonnegative price");
    expect(() => render(() => <PlanCard name="Team" price={10} features={[]} action={<Button>Choose</Button>} />)).toThrow("requires a currency");
  });

  it("names every logo in text and renders testimonial figure semantics", () => {
    const logos = render(() => <LogoCloud label="Trusted by" items={[{ id: "acme", name: "Acme", logo: <svg />, href: "https://acme.example" }, { id: "globex", name: "Globex" }]} />);
    expect(logos).toMatch(/<section[^>]*aria-labelledby=/u);
    expect(logos).toContain('class="sheen-marketing-visually-hidden">Acme');
    expect(logos).toContain('href="https://acme.example"');
    expect(logos).toContain('class="sheen-logo-cloud-wordmark">Globex');
    const quote = render(() => <Testimonial quote={<p>Great.</p>} author="Ada" authorRole="Engineer" cite="https://example.com" />);
    expect(quote).toMatch(/<figure[^>]*>.*<blockquote[^>]*cite="https:\/\/example.com".*<figcaption/su);
    expect(quote).toContain("Engineer");
  });

  it("server-renders collapsed FAQ answers under next-level question headings", () => {
    const html = render(() => <Faq title="Questions" items={[{ id: "license", question: "What license?", answer: <p>MIT.</p> }]} />);
    expect(html).toMatch(/<h2[^>]*>Questions<\/h2>/u);
    expect(html).toMatch(/<h3[^>]*class="sheen-accordion-heading/u);
    expect(html).toContain("MIT.");
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders the CTA band and a footer with labelled column and legal navigation", () => {
    const cta = render(() => <CtaBand title="Start today" actions={<Link href="/start">Start</Link>} headingLevel={3} />);
    expect(cta).toMatch(/<h3[^>]*>Start today<\/h3>/u);
    const footer = render(() => <SiteFooter brand={<strong>Northstar</strong>} columns={[{ id: "product", title: "Product", links: [{ href: "/pricing", label: "Pricing" }] }]} legal={<span>© Northstar</span>} legalLinks={[{ href: "/privacy", label: "Privacy" }]} />);
    expect(footer).toContain("<footer");
    const columnLabel = footer.match(/<nav[^>]*aria-labelledby="([^"]+)"/u)?.[1];
    expect(columnLabel).toBeTruthy();
    expect(footer).toMatch(new RegExp(`<h2[^>]*id="${columnLabel}"[^>]*>Product`, "u"));
    expect(footer).toMatch(/<nav[^>]*aria-label="Legal"/u);
    const bare = render(() => <SiteFooter columns={[{ id: "a", title: "A", links: [] }]} />);
    expect(bare).not.toContain("sheen-site-footer-about");
    expect(bare).not.toContain("sheen-site-footer-legal");
  });
});
