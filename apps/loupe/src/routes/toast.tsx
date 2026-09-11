import { For, Show, createSignal } from "solid-js";
import { Button, Checkbox, Input, Stack, ThemeScope, Toast, createToaster } from "@gemologic/sheen";
import type { ToastId, ToastOptions } from "@gemologic/sheen";

function Cards(props: { label: string }) {
  const notices = createToaster();
  const [current, setCurrent] = createSignal<ToastId>();
  const [reject, setReject] = createSignal(true);
  const [attempts, setAttempts] = createSignal(0);
  const options = (title: string): ToastOptions => ({ title, description: "Your workspace remains available.", tone: "success", action: {
    label: "Undo", errorMessage: "Undo failed. Your change is still saved.",
    run: async () => {
      setAttempts(value => value + 1);
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: reject() }) });
      if (!response.ok) throw new Error("Private transport details must not appear in the card");
    },
  } });
  const refresh = () => { const id = current(); if (id) notices.update(id, options(`${props.label} refreshed`)); };
  return <Stack>
    <Button onClick={() => setCurrent(notices.show(options(`${props.label} saved`)))}>{props.label} show</Button>
    <Button onClick={refresh}>{props.label} refresh</Button>
    <Button onClick={() => window.setTimeout(refresh, 400)}>{props.label} schedule refresh</Button>
    <Checkbox label={`${props.label} reject undo`} checked={reject()} onCheckedChange={setReject} />
    <output aria-label={`${props.label} attempts`}>{attempts()}</output>
    <For each={notices.notifications().map(item => item.id)}>{id => <Show when={notices.notifications().find(item => item.id === id)}>{notification =>
      <Toast notification={notification()} onAction={() => { void notices.runAction(id); }} onDismiss={() => { notices.dismiss(id); }} />
    }</Show>}</For>
  </Stack>;
}

export default function ToastFixture() {
  return <main><h1>Toast card qualification</h1><Input label="Unrelated draft" /><Stack>
    <Cards label="Root" />
    <ThemeScope theme="paper" mode="light" direction="rtl" messages={{ close: "Dismiss", retry: "Try again" }}><Cards label="Scoped" /></ThemeScope>
  </Stack></main>;
}
