import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { VirtualTextViewer } from "./VirtualTextViewer.tsx";
import type { ViewerTextRow } from "./viewer-model.ts";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly id: string;
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly details?: string;
}

export interface LogViewerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly entries: readonly LogEntry[];
  readonly label: string;
  readonly searchable?: boolean;
  readonly copyable?: boolean;
  readonly initialHeight?: number;
  readonly lineHeight?: number;
  readonly onCopyError?: (error: unknown) => void;
}

function logRows(entries: readonly LogEntry[]): readonly ViewerTextRow[] {
  const ids = new Set<string>();
  return Object.freeze(entries.map(entry => {
    if (!entry.id.trim() || ids.has(entry.id)) throw new Error("LogViewer entries require unique nonempty IDs");
    if (!entry.timestamp.trim() || !entry.message.trim()) throw new Error("LogViewer entries require nonempty timestamps and messages");
    ids.add(entry.id);
    const prefix = `${entry.timestamp} ${entry.level.toUpperCase().padEnd(5)} `;
    const text = `${entry.message}${entry.details ? ` ${entry.details}` : ""}`;
    return Object.freeze({ id: entry.id, kind: entry.level, prefix, text, label: `${entry.level}, ${entry.timestamp}: ${entry.message}${entry.details ? `. ${entry.details}` : ""}` });
  }));
}

export function LogViewer(props: LogViewerProps): JSX.Element {
  const [local, rest] = splitProps(props, ["entries", "label", "searchable", "copyable", "initialHeight", "lineHeight", "onCopyError"]);
  const rows = createMemo(() => logRows(local.entries));
  const copyText = createMemo(() => rows().map(row => `${row.prefix ?? ""}${row.text}`).join("\n"));
  return <VirtualTextViewer {...rest} rows={rows()} copyText={copyText()} label={local.label} searchable={local.searchable ?? true} copyable={local.copyable ?? true}
    initialHeight={local.initialHeight ?? 360} lineHeight={local.lineHeight ?? 22} {...(local.onCopyError === undefined ? {} : { onCopyError: local.onCopyError })} />;
}
