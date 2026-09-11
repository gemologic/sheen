import { Button, Dialog, Input, Row, Stack, ThemeScope, Toaster, createToaster } from "@gemologic/sheen";
import { Show, createSignal } from "solid-js";

function DisposableNotifications() {
  const notices = createToaster();
  return <>
    <Button onClick={() => notices.show({ title: "Disposable action", duration: null, action: { label: "Commit", errorMessage: "Commit failed", run: async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (!response.ok) throw new Error("Commit rejected");
    } } })}>Show disposable action</Button>
    <Toaster controller={notices} label="Disposable notices" />
  </>;
}

function ScopedToaster() {
  const notices = createToaster();
  return <>
    <Dialog title="Scoped dialog" trigger="Open scoped dialog">
      <Input label="Scoped draft" />
      <Button onClick={() => notices.show({ title: "Scoped notification", description: "Still inside the light RTL scope", duration: null, priority: "assertive" })}>Show scoped notification</Button>
    </Dialog>
    <Toaster controller={notices} />
  </>;
}
export default function ToasterFixture() {
  const notices = createToaster();
  const [limit, setLimit] = createSignal(1);
  const [presenter, setPresenter] = createSignal(true);
  const [owner, setOwner] = createSignal(true);
  return <main><h1>Toaster qualification</h1><Stack>
    <Input label="Unrelated draft" />
    <Button onClick={() => { notices.show({ title: "First notification", duration: null }); notices.show({ title: "Queued notification", duration: 600 }); }}>Queue two</Button>
    <Button onClick={() => notices.show({ title: "Timed notification", duration: 1200 })}>Show timed notification</Button>
    <Button onClick={() => notices.show({ title: "Successful action", duration: null, action: { label: "Apply", errorMessage: "Apply failed", run: async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
      if (!response.ok) throw new Error("Apply rejected");
    } } })}>Show successful action</Button>
    <Button onClick={() => notices.show({ title: "Action notification", duration: 300, action: { label: "Undo", errorMessage: "Undo failed safely", run: async () => {
      const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: true }) });
      if (!response.ok) throw new Error("Private failure");
    } } })}>Show action notification</Button>
    <Button onClick={() => notices.clear()}>Clear root notifications</Button>
    <Row><Button onClick={() => {
      notices.clear(); setLimit(2);
      notices.show({ title: "Persistent first", duration: null });
      notices.show({ title: "Resumable second", duration: 1600 });
    }}>Show resumable pair</Button>
    <Button onClick={() => setLimit(1)}>Limit to one</Button>
    <Button onClick={() => setLimit(2)}>Limit to two</Button></Row>
    <Button onClick={() => {
      notices.clear(); setLimit(3);
      notices.show({ title: "Saved changes", description: "Your workspace is up to date.", tone: "success", duration: null });
      notices.show({ title: "Background sync", description: "Existing drafts remain available.", duration: null });
      notices.show({ title: "Review required", description: "A conflicting edit needs your attention.", tone: "warning", duration: null });
    }}>Show stack</Button>
    <Row><Button onClick={() => setPresenter(value => !value)}>Toggle root presenter</Button>
    <Button onClick={() => setOwner(value => !value)}>Toggle notification owner</Button></Row>
    <Show when={presenter()}><Toaster controller={notices} limit={limit()} /></Show>
    <Show when={owner()}><DisposableNotifications /></Show>
    <ThemeScope theme="paper" mode="light" direction="rtl" messages={{ notifications: "Scoped notices", close: "Dismiss" }}><ScopedToaster /></ThemeScope>
  </Stack></main>;
}
