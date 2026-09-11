import { Show, createSignal, onCleanup } from "solid-js";
import { Button, Card, Checkbox, Heading, Input, Select, Stack, Text, Textarea } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { GalleryScenario } from "../../gallery-scenario.tsx";

const plans: readonly SelectOption[] = [{ value: "starter", label: "Starter" }, { value: "team", label: "Team" }, { value: "enterprise", label: "Enterprise" }];

export default function FormGallery() {
  const [email, setEmail] = createSignal("");
  const [plan, setPlan] = createSignal("team");
  const [terms, setTerms] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [attempted, setAttempted] = createSignal(false);
  let submitTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => { if (submitTimer !== undefined) clearTimeout(submitTimer); });
  const submit = (event: SubmitEvent): void => {
    event.preventDefault();
    setAttempted(true);
    if (!email().includes("@") || !terms() || pending()) return;
    setPending(true);
    submitTimer = setTimeout(() => { submitTimer = undefined; setPending(false); setSubmitted(true); }, 650);
  };
  return <GalleryScenario path="/gallery/form" title="Provision workspace" description="A validation-heavy application form with app-owned errors and an asynchronous accepted result." emptyHeading="No form schema" emptyDescription="The selected workflow has no fields.">
    {revision => <Card class="loupe-gallery-form-card"><form aria-label="Provision workspace" noValidate onSubmit={submit}>
      <Stack gap="lg">
        <div><Heading level={2}>Account details</Heading><Text tone="muted">Schema revision {revision()}. Validation never replaces the active form.</Text></div>
        <Input label="Work email" value={email()} required error={attempted() && !email().includes("@") ? "Enter a valid email address." : ""} onInput={event => setEmail(event.currentTarget.value)} />
        <Input label="Workspace name" value="Analytical engines" required />
        <Select label="Plan" value={plan()} options={plans} onValueChange={value => { if (value) setPlan(value); }} />
        <Textarea label="Use case" description="Explain the expected workload." autoResize value="Tables, charts, and retained background refreshes." />
        <Checkbox label="I accept the service terms" checked={terms()} error={attempted() && !terms() ? "Acceptance is required." : ""} onCheckedChange={setTerms} />
        <div class="actions"><Button type="submit" variant="solid" tone="accent" loading={pending()}>Create workspace</Button><output aria-live="polite">{pending() ? "Submitting" : submitted() ? `Accepted ${email()} on ${plan()}` : ""}</output></div>
        <Show when={submitted()}><p class="loupe-gallery-form-success">The latest valid submission was accepted.</p></Show>
      </Stack>
    </form></Card>}
  </GalleryScenario>;
}
