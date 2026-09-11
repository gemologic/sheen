import { Show, createSignal } from "solid-js";
import { AlertDialog, Button, Dialog, Input, Stack, ThemeScope, createConfirm } from "@gemologic/sheen";

function ConfirmFixture(props: { onResult: (result: string) => void }) {
  const controller = createConfirm();
  let abort: AbortController | undefined;
  async function ask(): Promise<void> {
    abort = new AbortController();
    const result = await controller.confirm({ title: "Remove saved view?", description: "The view can be recreated later.", confirmLabel: "Remove view", cancelLabel: "Keep view", tone: "danger", signal: abort.signal });
    props.onResult(String(result));
  }
  return <>
    <Button onClick={() => void ask()}>Ask confirmation</Button>
    <Button onClick={() => abort?.abort()}>Abort confirmation</Button>
    <Button onClick={() => { void controller.confirm({ title: "Overlapping", description: "Must not replace the active question." }).catch(error => props.onResult(error instanceof Error ? error.message : "Rejected")); }}>Overlap confirmation</Button>
    <controller.Dialog />
  </>;
}

export default function DialogFixture() {
  const [open, setOpen] = createSignal(false);
  const [locked, setLocked] = createSignal(false);
  const [requests, setRequests] = createSignal(0);
  const [description, setDescription] = createSignal("Review the workspace settings.");
  const [result, setResult] = createSignal("");
  const [mounted, setMounted] = createSignal(true);
  let returnButton: HTMLButtonElement | undefined;
  let preferred: HTMLInputElement | undefined;
  return <main><h1>Dialog qualification</h1><Stack>
    <Dialog title="Settings" trigger="Open settings" description={description()} initialFocus={() => preferred}>
      <Input label="Workspace name" ref={preferred} />
      <Button onClick={() => setDescription("Updated without replacing the input.")}>Refresh description</Button>
      <Dialog title="Nested settings" trigger="Open nested settings"><Input label="Nested name" /></Dialog>
    </Dialog>
    <Button ref={returnButton} onClick={() => setOpen(true)}>Open controlled</Button>
    <Dialog title="Controlled settings" open={open()} onOpenChange={next => { setRequests(current => current + 1); if (next) setOpen(true); }} returnFocus={() => returnButton}>
      <p>Closing requests are rejected until the owner accepts.</p>
      <Button onClick={() => setOpen(false)}>Owner closes</Button>
      <output aria-label="Close requests">{requests()}</output>
    </Dialog>
    <Dialog title="Locked operation" trigger="Open locked operation" dismissible={!locked()}>
      <Button onClick={() => setLocked(current => !current)}>Locked: {String(locked())}</Button>
    </Dialog>
    <ThemeScope theme="paper" mode="light" direction="rtl">
      <AlertDialog title="Remove workspace?" trigger="Review removal" description="Saved views will be removed." closeLabel="Keep workspace">
        <Button tone="danger" variant="solid">Destructive action placeholder</Button>
      </AlertDialog>
      <Show when={mounted()}><ConfirmFixture onResult={setResult} /></Show>
      <Button onClick={() => setMounted(false)}>Dispose confirmation owner</Button>
      <output aria-label="Confirmation result">{result()}</output>
    </ThemeScope>
  </Stack></main>;
}
