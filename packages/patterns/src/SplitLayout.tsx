import { Resizable, ResizableHandle, ResizablePanel, ScrollArea, cn } from "@gemologic/sheen";
import { children, createMemo, createSignal, createUniqueId, splitProps } from "solid-js";
import type { JSX } from "solid-js";
import type { ResizablePersistence } from "@gemologic/sheen";

export interface SplitLayoutProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "aria-label" | "onChange"> {
  readonly label: string;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly handleLabel: string;
  readonly start: JSX.Element;
  readonly end: JSX.Element;
  readonly orientation?: "horizontal" | "vertical";
  readonly narrowLayout?: "stack" | "split";
  readonly sizes?: readonly number[];
  readonly defaultSizes?: readonly number[];
  readonly onSizesChange?: (sizes: readonly number[]) => void;
  readonly keyboardStep?: number;
  readonly persistence?: ResizablePersistence;
  readonly startMinSize?: number;
  readonly startMaxSize?: number;
  readonly endMinSize?: number;
  readonly endMaxSize?: number;
  readonly refreshing?: boolean;
}

function requiredText(value: string, name: string): string {
  if (!value.trim()) throw new Error(`SplitLayout requires a nonempty ${name}`);
  return value;
}

export function SplitLayout(props: SplitLayoutProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "ref", "label", "startLabel", "endLabel", "handleLabel", "start", "end", "orientation", "narrowLayout", "sizes", "defaultSizes", "onSizesChange", "keyboardStep", "persistence", "startMinSize", "startMaxSize", "endMinSize", "endMaxSize", "refreshing"]);
  const start = children(() => local.start);
  const end = children(() => local.end);
  const label = createMemo(() => requiredText(local.label, "label"));
  const startLabel = createMemo(() => requiredText(local.startLabel, "startLabel"));
  const endLabel = createMemo(() => requiredText(local.endLabel, "endLabel"));
  const handleLabel = createMemo(() => requiredText(local.handleLabel, "handleLabel"));
  const panelIdPrefix = createUniqueId();
  const orientation = () => local.orientation ?? "horizontal";
  const [acceptedSizes, setAcceptedSizes] = createSignal<readonly number[]>(local.defaultSizes ?? local.persistence?.initialSizes ?? [0.5, 0.5]);
  const sizes = () => local.sizes ?? acceptedSizes();
  const changeSizes = (next: readonly number[]): void => {
    if (local.sizes === undefined) setAcceptedSizes(next);
    local.onSizesChange?.(next);
  };
  const resizableOptions = () => ({
    ...(local.defaultSizes === undefined ? {} : { defaultSizes: local.defaultSizes }),
    ...(local.keyboardStep === undefined ? {} : { keyboardStep: local.keyboardStep }),
    ...(local.persistence === undefined ? {} : { persistence: local.persistence }),
  });
  return <div {...rest} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-split-layout", local.class)}
    role="group" aria-label={label()} aria-busy={local.refreshing || undefined} data-orientation={orientation()} data-narrow-layout={local.narrowLayout ?? "stack"} data-refreshing={local.refreshing || undefined}>
    <Resizable {...resizableOptions()} class="sheen-split-layout-frame" orientation={orientation()} sizes={sizes()} onSizesChange={changeSizes}>
      <ResizablePanel index={0} panelId={`${panelIdPrefix}-start`} minSize={local.startMinSize ?? 0.2} {...(local.startMaxSize === undefined ? {} : { maxSize: local.startMaxSize })}>
        <ScrollArea class="sheen-split-layout-pane" label={startLabel()}>{start()}</ScrollArea>
      </ResizablePanel>
      <ResizableHandle index={0} label={handleLabel()} />
      <ResizablePanel index={1} panelId={`${panelIdPrefix}-end`} minSize={local.endMinSize ?? 0.2} {...(local.endMaxSize === undefined ? {} : { maxSize: local.endMaxSize })}>
        <ScrollArea class="sheen-split-layout-pane" label={endLabel()}>{end()}</ScrollArea>
      </ResizablePanel>
    </Resizable>
  </div>;
}
