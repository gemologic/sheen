import { Title } from "@solidjs/meta";
import { Avatar, Button, Card, Input, Link } from "@gemologic/sheen";
import { LightningIcon, ShieldCheckIcon, SparkleIcon, TerminalIcon } from "@gemologic/sheen-icons";
import { CtaBand, Faq, FeatureGrid, Hero, LogoCloud, MarketingSection, PricingTable, SiteFooter, SiteHeader, Testimonial } from "@gemologic/sheen-patterns/marketing";
import type { PricingPeriod, PricingPlan } from "@gemologic/sheen-patterns/marketing";
import { createSignal } from "solid-js";
import "@gemologic/sheen-patterns/marketing/styles.css";

const periods: readonly PricingPeriod[] = [
  { value: "month", label: "Monthly", suffix: "/ month" },
  { value: "year", label: "Yearly", suffix: "/ year" },
];

export default function MarketingPage() {
  const [requested, setRequested] = createSignal("");
  const plans: readonly PricingPlan[] = [
    { id: "starter", name: "Starter", description: "For side projects and prototypes.", prices: { month: 0, year: 0 }, features: ["Three projects", "Community support", "Public dashboards"], action: <Link href="#signup-starter" variant="button">Start for free</Link> },
    { id: "team", name: "Team", description: "For product teams shipping weekly.", prices: { month: 29, year: 290 }, highlighted: true, badge: "Most popular", features: ["Unlimited projects", "Role-based access", "Email support", "Audit history"], action: <Link href="#signup-team" variant="button" appearance="solid" tone="accent">Start a trial</Link> },
    { id: "enterprise", name: "Enterprise", description: "For regulated organizations.", priceLabel: "Custom", features: ["SAML single sign-on", "Dedicated region", "Uptime commitment"], action: <Link href="#contact" variant="button">Contact sales</Link> },
  ];
  return <>
    <Title>Northstar · Calm tools for busy teams</Title>
    <SiteHeader
      sticky
      brand={<Link href="/marketing" variant="quiet" aria-label="Northstar home"><strong>Northstar</strong></Link>}
      links={[{ href: "#features", label: "Features" }, { href: "#pricing", label: "Pricing", current: true }, { href: "#faq", label: "FAQ" }, { href: "/components", label: "Docs" }]}
      actions={<><Link href="#sign-in" variant="button">Sign in</Link><Button variant="solid" tone="accent" onClick={() => setRequested("Demo requested")}>Book a demo</Button></>}
    />
    <main aria-label="Northstar">
      <Hero
        eyebrow="Operations platform"
        title="Calm tools for teams that move fast"
        lead={<p>Northstar keeps incidents, approvals, and customer requests in one quiet workspace, with complete server-rendered pages and keyboard paths everywhere.</p>}
        actions={<><Link href="#pricing" variant="button" appearance="solid" tone="accent" size="lg">See pricing</Link><Link href="/components">Explore components</Link></>}
        media={<Card padding="lg">
          <Input label="Workspace name" placeholder="Acme operations" />
          <output role="status" aria-live="polite">{requested()}</output>
        </Card>}
      />
      <LogoCloud label="Trusted by operations teams at" items={[{ id: "acme", name: "Acme" }, { id: "globex", name: "Globex" }, { id: "initech", name: "Initech" }, { id: "umbrella", name: "Umbrella" }, { id: "hooli", name: "Hooli" }]} />
      <FeatureGrid id="features" eyebrow="Features" title="Everything a busy team needs, nothing it doesn't" description={<p>Dense where it matters and quiet everywhere else.</p>} columns={4} items={[
        { id: "fast", title: "Fast by default", description: "Small entries keep public pages light and admin bundles separate.", icon: <LightningIcon /> },
        { id: "secure", title: "Secure access", description: "Role-based permissions clear unauthorized content immediately.", icon: <ShieldCheckIcon /> },
        { id: "keyboard", title: "Keyboard first", description: "Every action has a visible keyboard path and a focus ring.", icon: <TerminalIcon /> },
        { id: "calm", title: "Calm design", description: "Accent is reserved for the one action that matters.", icon: <SparkleIcon /> },
      ]} />
      <PricingTable id="pricing" eyebrow="Pricing" title="Simple, predictable pricing" description={<p>Switch billing periods at any time. Prices exclude tax.</p>} currency="USD" periods={periods} plans={plans} />
      <MarketingSection title="What teams say" columns={2}>
        <Testimonial quote={<p>We replaced three internal component kits in a week, and our on-call pages finally look like one product.</p>} author="Ada Lovelace" authorRole="Head of Platform, Analytical Engines" avatar={<Avatar label="Ada Lovelace" />} />
        <Testimonial quote={<p>Dense without feeling cramped. Our support team lives in it all day.</p>} author="Grace Hopper" authorRole="Director of Support, Compiler Co." avatar={<Avatar label="Grace Hopper" />} />
      </MarketingSection>
      <Faq id="faq" title="Frequently asked questions" description={<p>Still curious? <Link href="#contact">Talk to us</Link>.</p>} items={[
        { id: "trial", question: "How long is the free trial?", answer: <p>Fourteen days on the Team plan, with no card required.</p> },
        { id: "cancel", question: "Can I cancel at any time?", answer: <p>Yes. You keep access until the end of the billing period.</p> },
        { id: "data", question: "Where is my data stored?", answer: <p>In the region you choose when you create the workspace.</p> },
      ]} />
      <CtaBand title="Bring your team to Northstar" description={<p>Start free, then upgrade when you are ready.</p>} actions={<><Link href="#signup-team" variant="button" appearance="solid" tone="accent">Start a trial</Link><Link href="#contact" variant="button">Contact sales</Link></>} />
    </main>
    <SiteFooter
      brand={<strong>Northstar</strong>}
      description={<p>Calm operations software for teams that move fast.</p>}
      columns={[
        { id: "product", title: "Product", links: [{ href: "#features", label: "Features" }, { href: "#pricing", label: "Pricing" }, { href: "/components", label: "Docs" }] },
        { id: "company", title: "Company", links: [{ href: "#about", label: "About" }, { href: "#careers", label: "Careers" }, { href: "#contact", label: "Contact" }] },
        { id: "resources", title: "Resources", links: [{ href: "#status", label: "Status" }, { href: "#changelog", label: "Changelog" }] },
      ]}
      legal={<span>© 2026 Northstar, Inc.</span>}
      legalLinks={[{ href: "#privacy", label: "Privacy" }, { href: "#terms", label: "Terms" }]}
    />
  </>;
}
