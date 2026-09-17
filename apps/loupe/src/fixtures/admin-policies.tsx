import { Badge, Button, CheckboxGroup, EmptyState, Input, Text } from "@gemologic/sheen";
import { useAdminServices } from "@gemologic/sheen-patterns/admin";
import { useUnsavedChanges } from "@gemologic/sheen-patterns";
import { For, Show, createSignal, onCleanup } from "solid-js";
import { AdminPolicyValidationError, parseAdminPolicy, policyScopeGroups } from "./admin-policy-data.ts";
import type { AdminPolicy } from "./admin-policy-data.ts";

export function AdminPolicies() {
  const services = useAdminServices();
  const [policies, setPolicies] = createSignal<readonly AdminPolicy[]>([]);
  const [name, setName] = createSignal("");
  const [scopes, setScopes] = createSignal<readonly string[]>([]);
  const [error, setError] = createSignal("");
  const [errorField, setErrorField] = createSignal<"name" | "scopes" | undefined>();
  const [pending, setPending] = createSignal(false);
  useUnsavedChanges(() => name().length > 0 || scopes().length > 0);
  let request: AbortController | undefined;
  let nameInput: HTMLInputElement | undefined;
  onCleanup(() => request?.abort());

  function reset(): void {
    setName("");
    setScopes([]);
    setError("");
    setErrorField(undefined);
  }
  async function submit(form: HTMLFormElement): Promise<void> {
    if (pending()) return;
    setError("");
    setErrorField(undefined);
    try {
      const data = new FormData(form);
      const policy = parseAdminPolicy({ name: data.get("name"), scopes: data.getAll("scopes") });
      if (policies().some(existing => existing.name === policy.name)) throw new AdminPolicyValidationError("A policy with this name already exists. Choose another name.", "name");
      request = new AbortController();
      const signal = request.signal;
      setPending(true);
      const response = await fetch("/api/admin-policy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(policy), signal });
      if (!response.ok) throw new Error(await response.text());
      const accepted = parseAdminPolicy(await response.json());
      if (signal.aborted) return;
      setPolicies(previous => [...previous, accepted]);
      reset();
      services.toasts.show({ title: `Created ${accepted.name}`, description: "Added to this demo session.", tone: "success" });
    } catch (failure) {
      if (!request?.signal.aborted) {
        setError(failure instanceof Error ? failure.message : "Could not create the policy. Try again.");
        setErrorField(failure instanceof AdminPolicyValidationError ? failure.field : undefined);
      }
    } finally {
      if (!request?.signal.aborted) setPending(false);
    }
  }
  async function remove(policy: AdminPolicy): Promise<void> {
    const confirmed = await services.confirm.confirm({ title: `Delete ${policy.name}?`, description: "Remove this policy and its permissions from this demo session. This cannot be undone.", confirmLabel: "Delete policy", tone: "danger" });
    if (!confirmed) return;
    setPolicies(previous => previous.filter(item => item.name !== policy.name));
    nameInput?.focus();
    services.toasts.show({ title: `Deleted ${policy.name}`, tone: "neutral" });
  }

  return <div class="loupe-admin-policy-layout">
    <section class="loupe-admin-content-card" aria-labelledby="policy-registry-heading">
      <header><div><h2 id="policy-registry-heading">Policies</h2><Text tone="muted">Demo policies last until you leave this page.</Text></div><Badge>{policies().length} total</Badge></header>
      <Show when={policies().length > 0} fallback={<EmptyState heading="No policies yet" description="Name a policy and choose the permissions it grants."><Button variant="outline" onClick={() => nameInput?.focus()}>Name your first policy</Button></EmptyState>}>
        <ul class="loupe-admin-policy-list"><For each={policies()}>{policy => <li>
          <div><strong>{policy.name}</strong><Text tone="muted">{policy.scopes.length} permissions</Text><details><summary>View permissions for {policy.name}</summary><ul><For each={policy.scopes}>{scope => <li><code>{scope}</code></li>}</For></ul></details></div>
          <Button variant="ghost" aria-label={`Delete ${policy.name}`} onClick={() => { void remove(policy); }}>Delete</Button>
        </li>}</For></ul>
      </Show>
    </section>
    <section class="loupe-admin-content-card" aria-labelledby="create-policy-heading" id="create-policy">
      <header><div><h2 id="create-policy-heading">Create policy</h2><Text tone="muted">Grant only the permissions needed for this task.</Text></div></header>
      <form class="loupe-admin-policy-form" aria-label="Create policy" aria-busy={pending() || undefined} onSubmit={event => { event.preventDefault(); void submit(event.currentTarget); }} onReset={event => { if (pending()) event.preventDefault(); else reset(); }}>
        <Input ref={element => { nameInput = element; }} label="Policy name" name="name" value={name()} onInput={event => setName(event.currentTarget.value)} readonly={pending()} autocomplete="off" description="3–48 lowercase letters, numbers, or hyphens. Start with a letter." {...(errorField() === "name" ? { error: error() } : {})} />
        <Text>{scopes().length} {scopes().length === 1 ? "permission" : "permissions"} selected</Text>
        <For each={policyScopeGroups}>{group => <CheckboxGroup name="scopes" label={group.label} description={`${scopes().filter(scope => group.options.some(option => option.value === scope)).length} selected in ${group.label.toLowerCase()}`} options={group.options} value={scopes().filter(scope => group.options.some(option => option.value === scope))} readOnly={pending()} onValueChange={next => setScopes(previous => [...previous.filter(scope => !group.options.some(option => option.value === scope)), ...next])} {...(errorField() === "scopes" ? { error: error() } : {})} />}</For>
        <Text tone="muted">Workspace administration requires an owner and cannot be granted here.</Text>
        <Show when={error()}><p role="alert">{error()}</p></Show>
        <div class="loupe-admin-page-actions"><Button type="submit" variant="solid" disabled={pending()}>{pending() ? "Creating policy…" : "Create policy"}</Button><Button type="reset" variant="ghost" disabled={pending()}>Reset form</Button></div>
      </form>
    </section>
  </div>;
}
