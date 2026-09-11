import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { createDiffRows } from "./diff.ts";
import { VirtualTextViewer } from "./VirtualTextViewer.tsx";

export interface DiffViewerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly oldText: string;
  readonly newText: string;
  readonly label: string;
  readonly oldLabel?: string;
  readonly newLabel?: string;
  readonly searchable?: boolean;
  readonly copyable?: boolean;
  readonly initialHeight?: number;
  readonly lineHeight?: number;
  readonly onCopyError?: (error: unknown) => void;
}

/** Unified line diff with bounded computation and a virtualized accessible line list. */
export function DiffViewer(props: DiffViewerProps): JSX.Element {
  const [local, rest] = splitProps(props, ["oldText", "newText", "label", "oldLabel", "newLabel", "searchable", "copyable", "initialHeight", "lineHeight", "onCopyError"]);
  const diff = createMemo(() => createDiffRows(local.oldText, local.newText, local.oldLabel?.trim() || "Before", local.newLabel?.trim() || "After"));
  return <VirtualTextViewer {...rest} rows={diff().rows} copyText={diff().unified} label={local.label} searchable={local.searchable ?? true} copyable={local.copyable ?? true}
    initialHeight={local.initialHeight ?? 360} lineHeight={local.lineHeight ?? 22} {...(local.onCopyError === undefined ? {} : { onCopyError: local.onCopyError })} />;
}
