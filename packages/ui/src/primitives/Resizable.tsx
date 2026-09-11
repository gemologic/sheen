import CorvuResizable from "@corvu/resizable";
import { createContext, createMemo, createSignal, splitProps, useContext, type JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface ResizablePersistence {
  readonly initialSizes: readonly number[];
  readonly save: (sizes: readonly number[]) => void | Promise<void>;
  readonly onError: (error: unknown) => void;
}

export interface ResizableProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  readonly children: JSX.Element;
  readonly orientation?: "horizontal" | "vertical";
  readonly sizes?: readonly number[];
  readonly defaultSizes?: readonly number[];
  readonly onSizesChange?: (sizes: readonly number[]) => void;
  readonly keyboardStep?: number;
  readonly persistence?: ResizablePersistence;
}

export interface ResizablePanelProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onResize"> {
  readonly children: JSX.Element;
  readonly index: number;
  readonly panelId?: string;
  readonly initialSize?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly collapsible?: boolean;
  readonly collapsedSize?: number;
  readonly collapseThreshold?: number;
  readonly onResize?: (size: number) => void;
  readonly onCollapse?: (size: number) => void;
  readonly onExpand?: (size: number) => void;
}

export interface ResizableHandleProps extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  readonly label: string;
  readonly index: number;
}

const ResizableInitialSizes = createContext<{ readonly at: (index: number) => number; readonly sizes: () => readonly number[] }>();

function validatedSizes(value: readonly number[], name: string): number[] {
  if (value.length < 2) throw new Error(`${name} requires at least two panel sizes`);
  let total = 0;
  const result = value.map((size, index) => {
    if (!Number.isFinite(size) || size < 0 || size > 1) throw new Error(`${name} panel ${index + 1} must be between zero and one`);
    total += size;
    return size;
  });
  if (Math.abs(total - 1) > 0.001) throw new Error(`${name} must sum to one`);
  return result;
}

function optionalSize(value: number | undefined, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${name} must be between zero and one`);
  return value;
}

function sameSizes(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((size, index) => Math.abs(size - (right[index] ?? Number.NaN)) < 0.000001);
}

export function Resizable(props: ResizableProps): JSX.Element {
  const [local, rest] = splitProps(props, ["class", "style", "children", "orientation", "sizes", "defaultSizes", "onSizesChange", "keyboardStep", "persistence", "ref"]);
  const [saving, setSaving] = createSignal(false);
  let pendingSaves = 0;
  const initialSizes = () => validatedSizes(local.defaultSizes ?? local.persistence?.initialSizes ?? [0.5, 0.5], "Resizable initial sizes");
  const [acceptedSizes, setAcceptedSizes] = createSignal<readonly number[]>(initialSizes());
  const effectiveSizes = createMemo(() => validatedSizes(local.sizes ?? acceptedSizes(), "Resizable sizes"));
  const keyboardDelta = () => {
    const value = local.keyboardStep ?? 0.05;
    if (!Number.isFinite(value) || value <= 0 || value > 1) throw new Error("Resizable keyboardStep must be greater than zero and at most one");
    return value;
  };
  const changed = (sizes: number[]) => {
    if (sizes.length !== initialSizes().length) return;
    const accepted = Object.freeze(validatedSizes(sizes, "Resizable result"));
    if (sameSizes(accepted, effectiveSizes())) return;
    if (local.sizes === undefined) setAcceptedSizes(accepted);
    local.onSizesChange?.(accepted);
    const persistence = local.persistence;
    if (!persistence) return;
    try {
      const result = persistence.save(accepted);
      if (result instanceof Promise) {
        pendingSaves += 1;
        setSaving(true);
        void result.catch(persistence.onError).finally(() => {
          pendingSaves -= 1;
          if (pendingSaves === 0) setSaving(false);
        });
      }
    } catch (error) {
      persistence.onError(error);
    }
  };
  const shared = () => ({
    ...(local.ref === undefined ? {} : { ref: local.ref }),
    ...(local.style === undefined ? {} : { style: local.style }),
  });
  const initialContext = { at: (index: number) => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= initialSizes().length) throw new Error("ResizablePanel index must address an initial size");
    const size = initialSizes()[index];
    if (size === undefined) throw new Error("ResizablePanel index must address an initial size");
    return size;
  }, sizes: effectiveSizes };
  return <CorvuResizable {...rest} {...shared()} sizes={effectiveSizes()} class={cn("sheen-resizable", local.class)} orientation={local.orientation ?? "horizontal"}
    initialSizes={initialSizes()} keyboardDelta={keyboardDelta()} onSizesChange={changed} data-saving={saving() || undefined}>
    <ResizableInitialSizes.Provider value={initialContext}>{local.children}</ResizableInitialSizes.Provider>
  </CorvuResizable>;
}

export function ResizablePanel(props: ResizablePanelProps): JSX.Element {
  const initial = useContext(ResizableInitialSizes);
  const [local, rest] = splitProps(props, ["class", "style", "children", "index", "panelId", "initialSize", "minSize", "maxSize", "collapsible", "collapsedSize", "collapseThreshold", "onResize", "onCollapse", "onExpand", "ref"]);
  const options = () => {
    const initialSize = optionalSize(local.initialSize ?? initial?.at(local.index), "ResizablePanel initialSize");
    const minSize = optionalSize(local.minSize, "ResizablePanel minSize");
    const maxSize = optionalSize(local.maxSize, "ResizablePanel maxSize");
    const collapsedSize = optionalSize(local.collapsedSize, "ResizablePanel collapsedSize");
    const collapseThreshold = optionalSize(local.collapseThreshold, "ResizablePanel collapseThreshold");
    return {
      ...(local.ref === undefined ? {} : { ref: local.ref }),
      ...(local.style === undefined ? {} : { style: local.style }),
      ...(local.panelId === undefined ? {} : { panelId: local.panelId }),
      ...(initialSize === undefined ? {} : { initialSize }),
      ...(minSize === undefined ? {} : { minSize }),
      ...(maxSize === undefined ? {} : { maxSize }),
      ...(local.collapsible === undefined ? {} : { collapsible: local.collapsible }),
      ...(collapsedSize === undefined ? {} : { collapsedSize }),
      ...(collapseThreshold === undefined ? {} : { collapseThreshold }),
      ...(local.onResize === undefined ? {} : { onResize: local.onResize }),
      ...(local.onCollapse === undefined ? {} : { onCollapse: local.onCollapse }),
      ...(local.onExpand === undefined ? {} : { onExpand: local.onExpand }),
    };
  };
  return <CorvuResizable.Panel {...rest} {...options()} class={cn("sheen-resizable-panel", local.class)}>
    {local.children}
  </CorvuResizable.Panel>;
}

export function ResizableHandle(props: ResizableHandleProps): JSX.Element {
  const initial = useContext(ResizableInitialSizes);
  if (!initial) throw new Error("ResizableHandle requires a Resizable parent");
  const [local, rest] = splitProps(props, ["class", "style", "label", "index", "ref", "disabled", "onBlur", "onFocus", "onKeyDown", "onKeyUp", "onMouseEnter", "onMouseLeave", "onPointerDown"]);
  if (!local.label.trim()) throw new Error("ResizableHandle requires a nonempty label");
  const percentage = () => {
    const sizes = initial.sizes();
    if (!Number.isSafeInteger(local.index) || local.index < 0 || local.index >= sizes.length - 1) throw new Error("ResizableHandle index must address the preceding panel");
    return Math.round(sizes.slice(0, local.index + 1).reduce((total, size) => total + size, 0) * 100);
  };
  const shared = () => ({
    ...(local.ref === undefined ? {} : { ref: local.ref }),
    ...(local.style === undefined ? {} : { style: local.style }),
    ...(local.disabled === undefined ? {} : { disabled: local.disabled }),
    ...(local.onBlur === undefined ? {} : { onBlur: local.onBlur }),
    ...(local.onFocus === undefined ? {} : { onFocus: local.onFocus }),
    ...(local.onKeyDown === undefined ? {} : { onKeyDown: local.onKeyDown }),
    ...(local.onKeyUp === undefined ? {} : { onKeyUp: local.onKeyUp }),
    ...(local.onMouseEnter === undefined ? {} : { onMouseEnter: local.onMouseEnter }),
    ...(local.onMouseLeave === undefined ? {} : { onMouseLeave: local.onMouseLeave }),
    ...(local.onPointerDown === undefined ? {} : { onPointerDown: local.onPointerDown }),
  });
  return <CorvuResizable.Handle {...rest} {...shared()} class={cn("sheen-resizable-handle", local.class)} aria-label={local.label}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage()} aria-valuetext={`${percentage()}%`}>
    <span aria-hidden="true" />
  </CorvuResizable.Handle>;
}
