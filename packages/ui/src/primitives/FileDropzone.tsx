import { For, Show, createMemo, createSignal, createUniqueId, onMount, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { useNumberFormatter } from "../theme/intl.ts";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { Button } from "./Button.tsx";
import { Progress } from "./Progress.tsx";

export type FileDropzoneStatus = "queued" | "uploading" | "complete" | "error";

export interface FileDropzoneItem {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly type?: string;
  readonly status: FileDropzoneStatus;
  readonly statusLabel: string;
  readonly progress?: number;
}

export type FileDropzoneRejectionReason = "count" | "size" | "type" | "custom";

export interface FileDropzoneRejection {
  readonly file: File;
  readonly reason: FileDropzoneRejectionReason;
  readonly message: string;
}

export interface FileDropzoneProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onDrop" | "onDragEnter" | "onDragLeave" | "onDragOver" | "ref"> {
  ref?: HTMLDivElement | ((element: HTMLDivElement) => void);
  inputRef?: HTMLInputElement | ((element: HTMLInputElement) => void);
  label: string;
  description?: string;
  chooseLabel?: string;
  dropLabel?: string;
  accept?: string;
  multiple?: boolean;
  capture?: "user" | "environment";
  maxFiles?: number;
  maxSize?: number;
  validateFile?: (file: File) => string | null;
  items?: readonly FileDropzoneItem[];
  onFilesSelected: (files: readonly File[]) => void;
  onFilesRejected?: (rejections: readonly FileDropzoneRejection[]) => void;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

function acceptPatterns(accept: string | undefined): readonly string[] {
  return (accept ?? "").split(",").map(pattern => pattern.trim().toLocaleLowerCase("en-US")).filter(Boolean);
}

function acceptsFile(file: File, patterns: readonly string[]): boolean {
  if (patterns.length === 0) return true;
  const name = file.name.toLocaleLowerCase("en-US");
  const type = file.type.toLocaleLowerCase("en-US");
  return patterns.some(pattern => {
    if (pattern.startsWith(".")) return name.endsWith(pattern);
    if (pattern.endsWith("/*")) return type.startsWith(pattern.slice(0, -1));
    return type === pattern;
  });
}

function hasFileDrag(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].includes("Files");
}

/** A native-picker-first file intake surface whose upload transport remains app-owned. */
export function FileDropzone(props: FileDropzoneProps): JSX.Element {
  const theme = useTheme();
  const number = useNumberFormatter({ maximumFractionDigits: 1 });
  const generatedId = createUniqueId();
  const [local, others] = splitProps(props, ["id", "ref", "inputRef", "class", "label", "description", "chooseLabel", "dropLabel", "accept", "multiple", "capture", "maxFiles", "maxSize", "validateFile", "items", "onFilesSelected", "onFilesRejected", "onRemove", "onRetry", "disabled", "readOnly", "aria-describedby", "aria-label", "aria-labelledby"]);
  const [dragDepth, setDragDepth] = createSignal(0);
  const [rejections, setRejections] = createSignal<readonly FileDropzoneRejection[]>([]);
  let input: HTMLInputElement | undefined;
  const patterns = createMemo(() => acceptPatterns(local.accept));
  const itemMap = createMemo(() => {
    if (local.maxFiles !== undefined && (!Number.isSafeInteger(local.maxFiles) || local.maxFiles <= 0)) throw new Error("FileDropzone: maxFiles must be a positive integer");
    if (local.maxSize !== undefined && (!Number.isFinite(local.maxSize) || local.maxSize <= 0)) throw new Error("FileDropzone: maxSize must be a positive finite byte count");
    const result = new Map<string, FileDropzoneItem>();
    for (const item of local.items ?? []) {
      if (!item.id.trim()) throw new Error("FileDropzone: item IDs must be nonempty");
      if (result.has(item.id)) throw new Error(`FileDropzone: duplicate item ID ${JSON.stringify(item.id)}`);
      if (!item.name.trim() || !Number.isFinite(item.size) || item.size < 0 || !item.statusLabel.trim()) throw new Error(`FileDropzone: invalid item ${JSON.stringify(item.id)}`);
      if (item.progress !== undefined && (!Number.isFinite(item.progress) || item.progress < 0 || item.progress > 1)) throw new Error(`FileDropzone: invalid progress for ${JSON.stringify(item.id)}`);
      result.set(item.id, item);
    }
    return result;
  });
  const itemIds = createMemo(() => [...itemMap().keys()]);
  const describedBy = () => [local.description ? `${generatedId}-description` : "", rejections().length ? `${generatedId}-errors` : "", local["aria-describedby"]].filter(Boolean).join(" ") || undefined;
  const formatSize = (bytes: number): string => {
    if (bytes < 1_000) return `${number().format(bytes)} B`;
    if (bytes < 1_000_000) return `${number().format(bytes / 1_000)} kB`;
    if (bytes < 1_000_000_000) return `${number().format(bytes / 1_000_000)} MB`;
    return `${number().format(bytes / 1_000_000_000)} GB`;
  };
  const processFiles = (files: readonly File[]): void => {
    if (local.disabled || local.readOnly || files.length === 0) return;
    const accepted: File[] = [];
    const rejected: FileDropzoneRejection[] = [];
    const remaining = local.maxFiles === undefined ? Number.MAX_SAFE_INTEGER : Math.max(0, local.maxFiles - itemIds().length);
    const capacity = local.multiple ? remaining : Math.min(1, remaining);
    for (const file of files) {
      let reason: FileDropzoneRejectionReason | undefined;
      let message = "";
      if (accepted.length >= capacity) {
        reason = "count";
        message = theme.messages().fileCountRejected.replaceAll("{count}", number().format(capacity));
      } else if (local.maxSize !== undefined && file.size > local.maxSize) {
        reason = "size";
        message = theme.messages().fileTooLarge.replaceAll("{name}", file.name).replaceAll("{size}", formatSize(local.maxSize));
      } else if (!acceptsFile(file, patterns())) {
        reason = "type";
        message = theme.messages().fileTypeRejected.replaceAll("{name}", file.name);
      } else {
        const custom = local.validateFile?.(file);
        if (custom) {
          reason = "custom";
          message = custom;
        }
      }
      if (reason) rejected.push({ file, reason, message });
      else accepted.push(file);
    }
    setRejections(rejected);
    if (rejected.length > 0) local.onFilesRejected?.(rejected);
    if (accepted.length > 0) local.onFilesSelected(accepted);
    if (input) input.value = "";
  };
  const dragActive = () => dragDepth() > 0;
  const dragEnter: JSX.EventHandler<HTMLDivElement, DragEvent> = event => {
    if (local.disabled || local.readOnly || !hasFileDrag(event)) return;
    event.preventDefault();
    setDragDepth(depth => depth + 1);
  };
  const dragLeave: JSX.EventHandler<HTMLDivElement, DragEvent> = event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    setDragDepth(depth => Math.max(0, depth - 1));
  };
  const dragOver: JSX.EventHandler<HTMLDivElement, DragEvent> = event => {
    if (local.disabled || local.readOnly || !hasFileDrag(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };
  const drop: JSX.EventHandler<HTMLDivElement, DragEvent> = event => {
    if (!hasFileDrag(event)) return;
    event.preventDefault();
    setDragDepth(0);
    processFiles([...(event.dataTransfer?.files ?? [])]);
  };
  onMount(() => {
    const files = input?.files;
    if (files && files.length > 0) processFiles([...files]);
  });
  const run = (callback: ((id: string) => void) | undefined, id: string): void => {
    if (!local.disabled && !local.readOnly) callback?.(id);
  };
  return <div {...others} id={local.id ?? generatedId} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-field sheen-file-dropzone", local.class)}
    data-drag-active={dragActive() || undefined} data-disabled={local.disabled || undefined} data-readonly={local.readOnly || undefined} onDragEnter={dragEnter} onDragLeave={dragLeave} onDragOver={dragOver} onDrop={drop}>
    <span id={`${generatedId}-label`} class="sheen-field-label">{local.label}</span>
    <div class="sheen-file-dropzone-target">
      <input id={`${generatedId}-input`} ref={element => { input = element; if (typeof local.inputRef === "function") local.inputRef(element); }} class="sheen-file-dropzone-input" type="file"
        accept={local.accept} multiple={local.multiple} capture={local.capture} disabled={local.disabled || local.readOnly} aria-label={local["aria-label"]} aria-labelledby={local["aria-label"] === undefined ? (local["aria-labelledby"] ?? `${generatedId}-label`) : undefined} aria-describedby={describedBy()}
        onChange={event => processFiles([...(event.currentTarget.files ?? [])])} />
      <label for={`${generatedId}-input`} class="sheen-file-dropzone-picker" aria-disabled={local.disabled || local.readOnly || undefined}>
        <span class="sheen-file-dropzone-picker-action" dir="auto">{local.chooseLabel ?? theme.messages().chooseFiles}</span>
        <span class="sheen-file-dropzone-prompt" dir="auto">{dragActive() ? (local.dropLabel ?? theme.messages().dropFilesHere) : theme.messages().fileDropHint}</span>
      </label>
    </div>
    <Show when={local.description}><span id={`${generatedId}-description`} class="sheen-field-description">{local.description}</span></Show>
    <Show when={rejections().length > 0}><div id={`${generatedId}-errors`} class="sheen-file-dropzone-errors" role="alert"><ul><For each={rejections()}>{rejection => <li>{rejection.message}</li>}</For></ul></div></Show>
    <Show when={itemIds().length > 0}><ul class="sheen-file-dropzone-items" aria-label={theme.messages().selectedFiles}><For each={itemIds()}>{id => {
      const item = () => itemMap().get(id);
      return <Show when={item()}>{current => <li class="sheen-file-dropzone-item" data-file-id={id} data-status={current().status} aria-busy={current().status === "uploading" || undefined}>
        <div class="sheen-file-dropzone-item-copy" dir="auto"><strong>{current().name}</strong><span>{formatSize(current().size)}<Show when={current().type}> · {current().type}</Show></span></div>
        <span class="sheen-file-dropzone-status" data-status={current().status} dir="auto">{current().statusLabel}</span>
        <Show when={current().status === "uploading"}><Progress label={theme.messages().uploadProgress.replaceAll("{name}", current().name)} {...(current().progress === undefined ? {} : { value: current().progress })} /></Show>
        <div class="sheen-file-dropzone-actions"><Show when={current().status === "error" && local.onRetry}><Button size="xs" disabled={local.disabled} aria-disabled={local.readOnly || undefined} aria-label={`${theme.messages().retry} ${current().name}`} onClick={() => run(local.onRetry, id)}>{theme.messages().retry}</Button></Show>
          <Show when={local.onRemove}><Button size="xs" disabled={local.disabled} aria-disabled={local.readOnly || undefined} aria-label={`${theme.messages().remove} ${current().name}`} onClick={() => run(local.onRemove, id)}>{theme.messages().remove}</Button></Show></div>
      </li>}</Show>;
    }}</For></ul></Show>
    <span class="sheen-file-dropzone-announcer" role="status" aria-live="polite" aria-atomic="true">{dragActive() ? (local.dropLabel ?? theme.messages().dropFilesHere) : ""}</span>
  </div>;
}
