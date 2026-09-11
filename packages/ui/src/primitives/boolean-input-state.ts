import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";

interface BooleanInputOptions {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  indeterminate?: boolean;
}

/** Shared ownership for native boolean inputs, including pre-hydration edits and reset. */
export function createBooleanInputState(options: BooleanInputOptions, onChange: (next: boolean) => void) {
  const initialChecked = options.defaultChecked ?? false;
  const [draft, setDraft] = createSignal(initialChecked);
  const controlled = createMemo(() => options.checked);
  const checked = () => controlled() ?? draft();
  const [mounted, setMounted] = createSignal(false);
  let input: HTMLInputElement | undefined;
  const change = (next: boolean) => {
    if (next === checked()) return;
    if (controlled() === undefined) setDraft(next);
    onChange(next);
  };
  onMount(() => {
    const element = input;
    const view = element?.ownerDocument.defaultView;
    if (!element || !view) return;
    // Reconcile an input already toggled before hydration with its visual/app state.
    if (!options.disabled && !options.readOnly) change(element.checked);
    element.checked = checked();
    element.indeterminate = options.indeterminate ?? false;
    setMounted(true);
    const pending = new Set<number>();
    const reset = (event: Event) => {
      if (event.target !== element.form) return;
      const task = view.setTimeout(() => {
        pending.delete(task);
        if (event.defaultPrevented) return;
        if (controlled() === undefined) change(initialChecked);
        element.checked = checked();
        element.indeterminate = options.indeterminate ?? false;
      }, 0);
      pending.add(task);
    };
    element.ownerDocument.addEventListener("reset", reset, true);
    onCleanup(() => {
      element.ownerDocument.removeEventListener("reset", reset, true);
      for (const task of pending) view.clearTimeout(task);
    });
  });
  createEffect(() => {
    if (!mounted() || !input) return;
    input.checked = checked();
    input.indeterminate = options.indeterminate ?? false;
  });
  const requestChange = (element: HTMLInputElement) => {
    if (options.disabled || options.readOnly) {
      element.checked = checked();
      return;
    }
    change(element.checked);
    element.checked = checked();
  };
  return { checked, requestChange, setInput: (element: HTMLInputElement) => { input = element; } };
}
