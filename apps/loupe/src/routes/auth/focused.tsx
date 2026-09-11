import { Title } from "@solidjs/meta";
import { Button, Link } from "@gemologic/sheen";
import { FocusedAuthLayout } from "@gemologic/sheen-patterns/auth";
import { createSignal } from "solid-js";

export default function FocusedAuthPage() {
  const [status, setStatus] = createSignal("");
  return <>
    <Title>Sign in · Northstar</Title>
    <FocusedAuthLayout
      brand={<Link href="/" class="loupe-auth-brand" aria-label="Northstar home"><span aria-hidden="true">N</span><strong>Northstar</strong></Link>}
      title="Welcome back"
      description="Use your organization account to continue to Northstar."
      footer={<><Link href="#support">Support</Link><Link href="#privacy">Privacy</Link><span>Protected by your organization</span></>}
    >
      <div class="loupe-auth-provider-stack">
        <Button class="loupe-auth-provider" variant="solid" tone="accent" onClick={() => setStatus("Continuing with company SSO")}>Continue with SSO</Button>
        <Button class="loupe-auth-provider" variant="outline" onClick={() => setStatus("Continuing with Google")}>Continue with Google</Button>
      </div>
      <p class="loupe-auth-note">You will be redirected to your identity provider. Northstar never receives your password.</p>
      <output class="loupe-auth-status" role="status" aria-live="polite">{status()}</output>
    </FocusedAuthLayout>
  </>;
}
