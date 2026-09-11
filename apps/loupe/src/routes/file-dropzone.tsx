import { FileDropzone, Stack, Surface, ThemeScope } from "@gemologic/sheen";
import type { FileDropzoneItem } from "@gemologic/sheen";
import { createSignal, onCleanup } from "solid-js";

export default function FileDropzoneFixture() {
  const [items, setItems] = createSignal<readonly FileDropzoneItem[]>([]);
  const [rejected, setRejected] = createSignal("");
  const files = new Map<string, File>();
  const attempts = new Map<string, number>();
  const controllers = new Map<string, AbortController>();
  let sequence = 0;
  const update = (id: string, change: Partial<FileDropzoneItem>): void => { setItems(current => current.map(item => item.id === id ? { ...item, ...change } : item)); };
  const upload = async (id: string): Promise<void> => {
    const file = files.get(id);
    if (!file) return;
    controllers.get(id)?.abort();
    const controller = new AbortController();
    controllers.set(id, controller);
    const attempt = (attempts.get(id) ?? 0) + 1;
    attempts.set(id, attempt);
    update(id, { status: "uploading", statusLabel: `Uploading, attempt ${attempt}`, progress: 0.35 });
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`/api/file-upload?attempt=${attempt}&delay=450`, { method: "POST", body, signal: controller.signal });
      if (!response.ok) throw new Error(`Upload failed (${response.status})`);
      update(id, { status: "complete", statusLabel: "Upload complete", progress: 1 });
    } catch (error: unknown) {
      if (controller.signal.aborted) return;
      update(id, { status: "error", statusLabel: error instanceof Error ? error.message : "Upload failed", progress: 0 });
    } finally {
      if (controllers.get(id) === controller) controllers.delete(id);
    }
  };
  const select = (selected: readonly File[]): void => {
    const records: FileDropzoneItem[] = [];
    for (const file of selected) {
      sequence += 1;
      const id = `file-${sequence}`;
      files.set(id, file);
      const record: FileDropzoneItem = file.type
        ? { id, name: file.name, size: file.size, type: file.type, status: "queued", statusLabel: "Queued" }
        : { id, name: file.name, size: file.size, status: "queued", statusLabel: "Queued" };
      records.push(record);
    }
    setItems(current => [...current, ...records]);
    for (const record of records) queueMicrotask(() => void upload(record.id));
  };
  const remove = (id: string): void => {
    controllers.get(id)?.abort();
    controllers.delete(id);
    files.delete(id);
    attempts.delete(id);
    setItems(current => current.filter(item => item.id !== id));
  };
  onCleanup(() => { for (const controller of controllers.values()) controller.abort(); });
  return <main class="loupe-file-dropzone-page"><h1>FileDropzone</h1><Stack>
    <Surface padding="lg"><div class="loupe-file-dropzone-bounds"><FileDropzone label="Evidence files" description="Plain text, at most three files and 64 bytes each." accept=".txt,text/plain" multiple maxFiles={3} maxSize={64}
      items={items()} onFilesSelected={select} onFilesRejected={failures => setRejected(failures.map(failure => `${failure.reason}:${failure.file.name}`).join(","))} onRetry={id => void upload(id)} onRemove={remove} /></div>
      <output aria-label="Rejected files">{rejected()}</output></Surface>
    <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-file-dropzone-scope"><FileDropzone label="Read-only files" readOnly items={[{ id: "contract", name: "contract.pdf", size: 2400, type: "application/pdf", status: "complete", statusLabel: "Upload complete" }]} onFilesSelected={() => {}} onRemove={() => {}} /></ThemeScope>
  </Stack></main>;
}
