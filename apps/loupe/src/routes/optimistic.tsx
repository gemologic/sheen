import { createSignal } from "solid-js";
import { Button, Checkbox, Input, Stack, optimistic } from "@gemologic/sheen";

export default function OptimisticFixture() {
  const [value, setValue] = createSignal(100);
  const [reject, setReject] = createSignal(false);
  const [pending, setPending] = createSignal(false);
  const [canUndo, setCanUndo] = createSignal(false);
  const [status, setStatus] = createSignal("Ready");
  const [reverts, setReverts] = createSignal(0);
  const [commits, setCommits] = createSignal(0);

  async function change(amount: number): Promise<void> {
    if (pending()) return;
    const shouldReject = reject();
    setPending(true);
    setStatus("Saving");
    try {
      await optimistic(() => {
        setValue(current => current + amount);
        return () => {
          setValue(current => current - amount);
          setReverts(current => current + 1);
        };
      }, async () => {
        setCommits(current => current + 1);
        const response = await fetch("/api/optimistic", {
          method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: shouldReject }),
        });
        if (!response.ok) throw new Error(await response.text());
      });
      setCanUndo(amount > 0);
      setStatus(amount > 0 ? "Saved" : "Undone");
    } catch {
      setStatus("Failed. The local change was reverted; retry is available.");
    } finally {
      setPending(false);
    }
  }

  return <main><h1>Optimistic operation qualification</h1><Stack>
    <Input label="Unrelated draft" />
    <Checkbox label="Reject commit" checked={reject()} onCheckedChange={setReject} />
    <div data-pending={pending() || undefined} aria-busy={pending()}>
      <output aria-label="Balance">{value()}</output>
      <output aria-label="Operation status" aria-live="polite">{status()}</output>
    </div>
    <Button loading={pending()} onClick={() => void change(10)}>Apply ten</Button>
    <Button disabled={!canUndo() || pending()} onClick={() => void change(-10)}>Undo ten</Button>
    <Button onClick={() => setValue(current => current + 25)}>Apply independent edit</Button>
    <output aria-label="Rollback count">{reverts()}</output>
    <output aria-label="Commit count">{commits()}</output>
  </Stack></main>;
}
