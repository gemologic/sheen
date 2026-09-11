import { createMemo, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { stringifyViewerJson } from "./json.ts";
import { VirtualTextViewer } from "./VirtualTextViewer.tsx";
import type { ViewerTextRow } from "./viewer-model.ts";

export interface JSONViewerProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children"> {
  readonly value: unknown;
  readonly label: string;
  readonly indent?: 2 | 4;
  readonly sortKeys?: boolean;
  readonly maxDepth?: number;
  readonly searchable?: boolean;
  readonly copyable?: boolean;
  readonly initialHeight?: number;
  readonly lineHeight?: number;
  readonly onCopyError?: (error: unknown) => void;
}

export function JSONViewer(props: JSONViewerProps): JSX.Element {
  const [local, rest] = splitProps(props, ["value", "label", "indent", "sortKeys", "maxDepth", "searchable", "copyable", "initialHeight", "lineHeight", "onCopyError"]);
  const json = createMemo(() => stringifyViewerJson(local.value, local.indent ?? 2, local.sortKeys ?? true, local.maxDepth ?? 32));
  const rows = createMemo<readonly ViewerTextRow[]>(() => Object.freeze(json().lines.map((text, index) => Object.freeze({ id: `json-${index + 1}`, text, label: `JSON line ${index + 1}: ${text}` }))));
  return <VirtualTextViewer {...rest} rows={rows()} copyText={json().text} label={local.label} searchable={local.searchable ?? true} copyable={local.copyable ?? true}
    initialHeight={local.initialHeight ?? 360} lineHeight={local.lineHeight ?? 22} {...(local.onCopyError === undefined ? {} : { onCopyError: local.onCopyError })} />;
}
