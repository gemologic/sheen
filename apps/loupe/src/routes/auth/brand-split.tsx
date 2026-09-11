import { Title } from "@solidjs/meta";
import { Button, Input, Link } from "@gemologic/sheen";
import { BrandSplitAuthLayout } from "@gemologic/sheen-patterns/auth";
import { createSignal } from "solid-js";

function ProductContext() {
  return <div class="loupe-auth-story">
    <span class="loupe-eyebrow">Operations, clarified</span>
    <div class="loupe-auth-story-copy">
      <h2>Turn noisy systems into one calm operating picture.</h2>
      <p>Northstar gives teams a shared view of accounts, incidents, and the decisions that keep work moving.</p>
    </div>
    <blockquote>
      <p>“We stopped reconciling five dashboards before every customer conversation.”</p>
      <footer><strong>Mara Chen</strong><span>VP Operations, Meridian</span></footer>
    </blockquote>
    <div class="loupe-auth-orbit" aria-hidden="true"><span /><span /><span /></div>
  </div>;
}

export default function BrandSplitAuthPage() {
  const [email, setEmail] = createSignal("");
  const [status, setStatus] = createSignal("");
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    const value = email().trim();
    setStatus(value ? `Continue link requested for ${value}` : "Enter your work email to continue");
  };
  return <>
    <Title>Access Northstar</Title>
    <BrandSplitAuthLayout
      brand={<Link href="/" class="loupe-auth-brand" aria-label="Northstar home"><span aria-hidden="true">N</span><strong>Northstar</strong></Link>}
      title="Access your workspace"
      description="Use your work email or your organization's single sign-on."
      aside={<ProductContext />}
      asideLabel="About Northstar"
      footer={<><Link href="#support">Need help?</Link><Link href="#privacy">Privacy</Link><Link href="#terms">Terms</Link></>}
    >
      <form class="loupe-auth-form" onSubmit={submit} novalidate>
        <Input name="email" type="email" autocomplete="email" label="Work email" value={email()} onInput={event => setEmail(event.currentTarget.value)} required />
        <Button type="submit" variant="solid" tone="accent">Continue with email</Button>
      </form>
      <div class="loupe-auth-divider"><span>or</span></div>
      <Button class="loupe-auth-provider" variant="outline" onClick={() => setStatus("Continuing with company SSO")}>Continue with SSO</Button>
      <output class="loupe-auth-status" role="status" aria-live="polite">{status()}</output>
    </BrandSplitAuthLayout>
  </>;
}
