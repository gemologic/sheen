import { createMemo, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

export function createChoiceOptions<Option extends { readonly value: string }>(source: Accessor<readonly Option[]>, root: Accessor<HTMLElement | undefined>, component: string) {
  let disposed = false;
  onCleanup(() => { disposed = true; });
  const byValue = createMemo(() => {
    const options = new Map<string, Option>();
    for (const option of source()) {
      if (options.has(option.value)) throw new Error(`${component}: duplicate option value ${JSON.stringify(option.value)}`);
      options.set(option.value, option);
    }
    return options;
  });
  let previousKeys: string[] = [];
  const keys = createMemo(() => {
    const next = [...byValue().keys()];
    const element = root();
    const focused = element?.querySelector<HTMLInputElement>("input:focus");
    if (element && focused) {
      const previousIndex = previousKeys.indexOf(focused.value);
      // Moving retained DOM may blur it. Never override a deliberate external focus move.
      element.ownerDocument.defaultView?.queueMicrotask(() => {
        if (disposed || !element.isConnected) return;
        const active = element.ownerDocument.activeElement;
        if (active !== element.ownerDocument.body && active !== focused) return;
        const inputs = [...element.querySelectorAll<HTMLInputElement>("input[type=checkbox], input[type=radio]")];
        const eligible = (input: HTMLInputElement) => !input.matches(":disabled");
        const retained = inputs.find(input => input.value === focused.value && eligible(input));
        const index = Math.max(0, previousIndex);
        const nearest = inputs.slice(index).find(eligible) ?? inputs.slice(0, index).reverse().find(eligible);
        (retained ?? nearest ?? element).focus({ preventScroll: true });
      });
    }
    previousKeys = next;
    return next;
  });
  return { byValue, keys };
}
