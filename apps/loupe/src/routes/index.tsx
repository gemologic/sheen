import { createSignal } from "solid-js";
import { Link as MetaLink, Meta, Title } from "@solidjs/meta";
import { Button, Dialog, Input, Link, ThemeScope } from "@gemologic/sheen";
const description = "Sheen is a dark-first SolidJS design system for dense, accessible, high-performance application interfaces.";

function Preview(props: { readonly label: string }) {
  const [count, setCount] = createSignal(0);
  return <div class="preview-content">
    <div class="loupe-theme-preview-heading"><span>{props.label}</span><small>Live scope</small></div>
    <div><h3>Workspace controls</h3><p>Quiet defaults, with color reserved for the primary action.</p></div>
    <Input label="Workspace name" placeholder="Enter a name" />
    <div class="actions"><Button variant="solid" tone="accent" onClick={() => setCount(value => value + 1)}>Save changes</Button><Button variant="outline">Cancel</Button><output aria-live="polite">Saved {count()}</output></div>
    <Dialog title="Workspace settings" trigger="Open settings" description="This dialog inherits the theme of its own preview.">
      <Input label="Dialog name" placeholder="Your workspace" />
      <Dialog title="Nested settings" trigger="Open nested settings" description="Escape dismisses one layer."><Input label="Nested name" /></Dialog>
    </Dialog>
  </div>;
}

export default function Home() {
  return <>
    <Title>Sheen · SolidJS application design system</Title>
    <Meta name="description" content={description} />
    <Meta property="og:type" content="website" />
    <Meta property="og:title" content="Sheen · SolidJS application design system" />
    <Meta property="og:description" content={description} />
    <Meta property="og:url" content="https://sheen.gemologic.dev/" />
    <Meta name="twitter:card" content="summary" />
    <MetaLink rel="canonical" href="https://sheen.gemologic.dev/" />
    <div class="loupe-home"><main class="loupe-home-main">
    <section class="loupe-home-intro" aria-labelledby="loupe-home-heading">
      <div class="loupe-home-intro-copy">
        <span class="loupe-eyebrow">Design-system workbench</span>
        <h1 id="loupe-home-heading">Build the application, then inspect every seam.</h1>
        <p>Compose a production-shaped AdminApp, browse the manifest-backed component inventory, and test themes without leaving Loupe.</p>
        <div class="loupe-home-actions">
          <Link href="/composer" variant="button" class="loupe-home-primary-action">Open Composer</Link>
          <Link href="/components" variant="button" class="loupe-home-secondary-action">Browse components</Link>
        </div>
      </div>
      <aside class="loupe-home-start" aria-label="Workbench destinations">
        <span class="loupe-eyebrow">Start here</span>
        <Link href="/admin"><strong>Admin starter</strong><span>Inspect the full application shell and navigation.</span></Link>
        <Link href="/auth/brand-split"><strong>Authentication starters</strong><span>Compare focused OIDC and brand-split entry points.</span></Link>
        <Link href="/theme-editor"><strong>Theme editor</strong><span>Tune tokens and validate contrast live.</span></Link>
        <Link href="/tokens"><strong>Token explorer</strong><span>Trace computed values back to consumers.</span></Link>
      </aside>
    </section>

    <section class="loupe-home-themes" aria-labelledby="theme-comparison-heading">
      <header><div><span class="loupe-eyebrow">Scoped theming</span><h2 id="theme-comparison-heading">One system, three visual voices</h2></div><p>Each surface has an independent theme and shared component behavior. The controls and overlays remain live.</p></header>
      <div class="comparison">
        <ThemeScope theme="obsidian" mode="dark" accent="jade" class="preview"><Preview label="Obsidian · Jade" /></ThemeScope>
        <ThemeScope theme="paper" mode="light" accent="indigo" class="preview"><Preview label="Paper · Indigo" /></ThemeScope>
        <ThemeScope theme="graphite" accent="amber" class="preview"><Preview label="Graphite · Amber" /></ThemeScope>
      </div>
    </section>
    </main></div>
  </>;
}
