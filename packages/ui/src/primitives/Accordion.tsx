import * as Primitive from "#sheen-kobalte/accordion";
import { createContext, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, splitProps, useContext } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { Button } from "./Button.tsx";
import { cn } from "../utils/cn.ts";

export interface AccordionProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onChange"> {
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  multiple?: boolean;
  collapsible?: boolean;
}
export interface AccordionItemProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string;
  label: string;
  disabled?: boolean;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}

const AccordionOptions = createContext<{
  multiple: Accessor<boolean>;
  collapsible: Accessor<boolean>;
  values: Set<string>;
  onKeyDown: Accessor<JSX.HTMLAttributes<HTMLDivElement>["onKeyDown"]>;
}>();

function AccordionContainer(props: JSX.HTMLAttributes<HTMLDivElement>): JSX.Element {
  const options = useContext(AccordionOptions);
  const [local, others] = splitProps(props, ["onKeyDown", "ref"]);
  let root: HTMLDivElement | undefined;
  const headers = (element: HTMLDivElement) => [...element.querySelectorAll<HTMLButtonElement>("[data-sheen-accordion-trigger]")]
    .filter(header => header.closest("[data-sheen-accordion]") === element);
  onMount(() => {
    const element = root;
    if (!element) return;
    let previous = headers(element);
    let focused: HTMLElement | undefined;
    const recordFocus = () => {
      const active = element.ownerDocument.activeElement;
      focused = active instanceof HTMLElement && element.contains(active) ? active : undefined;
    };
    recordFocus();
    element.ownerDocument.addEventListener("focusin", recordFocus);
    const observer = new MutationObserver(() => {
      const next = headers(element);
      const active = element.ownerDocument.activeElement;
      const previousFocus = focused;
      if (element.isConnected && previousFocus && active === element.ownerDocument.body) {
        const eligible = (target: HTMLElement) => target.isConnected && !target.matches(":disabled") && !target.closest("[inert], [hidden]") && target.getClientRects().length > 0;
        const retained = element.contains(previousFocus) && eligible(previousFocus) ? previousFocus : undefined;
        const previousIndex = previous.findIndex(header => header.closest(".sheen-accordion-item")?.contains(previousFocus));
        if (previousIndex >= 0) {
          const index = Math.min(previousIndex, next.length);
          const nearest = next.slice(index).find(eligible) ?? next.slice(0, index).reverse().find(eligible);
          (retained ?? nearest ?? element).focus({ preventScroll: true });
        }
      }
      previous = next;
    });
    observer.observe(element, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "hidden", "inert"] });
    onCleanup(() => {
      observer.disconnect();
      element.ownerDocument.removeEventListener("focusin", recordFocus);
    });
  });
  const onKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = event => {
    const handler = options?.onKeyDown();
    if (typeof handler === "function") handler(event);
    else if (handler) handler[0](handler[1], event);
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || !target.hasAttribute("data-sheen-accordion-trigger") || target.closest("[data-sheen-accordion]") !== event.currentTarget) return;
    const triggers = headers(event.currentTarget).filter(element => !element.disabled);
    const index = triggers.indexOf(target);
    if (index < 0) return;
    let next: HTMLButtonElement | undefined;
    switch (event.key) {
      case "ArrowDown": next = triggers[(index + 1) % triggers.length]; break;
      case "ArrowUp": next = triggers[(index + triggers.length - 1) % triggers.length]; break;
      case "Home": next = triggers[0]; break;
      case "End": next = triggers.at(-1); break;
      default: return;
    }
    event.preventDefault();
    next?.focus();
  };
  return <div {...others} ref={element => { root = element; if (typeof local.ref === "function") local.ref(element); }} tabIndex={others.tabIndex ?? -1} data-sheen-accordion="" onKeyDown={onKeyDown} />;
}

export function Accordion(props: AccordionProps): JSX.Element {
  const [local, others] = splitProps(props, ["value", "defaultValue", "onValueChange", "multiple", "collapsible", "class", "id", "ref", "onKeyDown", "onMouseDown", "onFocusIn", "onFocusOut"]);
  const id = createUniqueId();
  const [draft, setDraft] = createSignal(local.defaultValue ?? []);
  const value = createMemo(() => {
    const next = local.value ?? draft();
    if (!local.multiple && next.length > 1) throw new Error("Accordion single mode accepts at most one expanded value");
    if (new Set(next).size !== next.length) throw new Error("Accordion expanded values must be unique");
    return next;
  });
  const options = { multiple: () => local.multiple ?? false, collapsible: () => local.collapsible ?? true, values: new Set<string>(), onKeyDown: () => local.onKeyDown };
  const common = () => ({
    ...(local.ref === undefined ? {} : { ref: local.ref }),
    ...(local.onMouseDown === undefined ? {} : { onMouseDown: local.onMouseDown }),
    ...(local.onFocusIn === undefined ? {} : { onFocusIn: local.onFocusIn }),
    ...(local.onFocusOut === undefined ? {} : { onFocusOut: local.onFocusOut }),
  });
  return <AccordionOptions.Provider value={options}><Primitive.Root as={AccordionContainer} {...others} {...common()} id={local.id ?? `sheen-accordion-${id}`} class={cn("sheen-accordion", local.class)} value={value()}
    onChange={next => { if (local.value === undefined) setDraft(next); local.onValueChange?.(next); }} multiple={options.multiple()} collapsible={options.collapsible()} /></AccordionOptions.Provider>;
}

export function AccordionItem(props: AccordionItemProps): JSX.Element {
  const context = Primitive.useAccordionContext();
  const options = useContext(AccordionOptions);
  if (!options) throw new Error("AccordionItem requires a sheen Accordion owner");
  const [local, others] = splitProps(props, ["value", "label", "disabled", "headingLevel", "class", "id", "children"]);
  const generatedId = createUniqueId();
  const id = () => local.id ?? `sheen-accordion-item-${generatedId}`;
  const open = () => context.listState().selectionManager().isSelected(local.value);
  createMemo(() => {
    const value = local.value;
    if (!value.trim() || !local.label.trim()) throw new Error("AccordionItem requires nonempty values and labels");
    if (options.values.has(value)) throw new Error(`Accordion duplicate item value: ${value}`);
    options.values.add(value);
    onCleanup(() => options.values.delete(value));
  });
  let trigger: HTMLButtonElement | undefined;
  let content: HTMLDivElement | undefined;
  const heading = (): "h2" | "h3" | "h4" | "h5" | "h6" => {
    switch (local.headingLevel) { case 2: return "h2"; case 4: return "h4"; case 5: return "h5"; case 6: return "h6"; default: return "h3"; }
  };
  createEffect(() => {
    if (!open() && content?.contains(content.ownerDocument.activeElement)) trigger?.focus({ preventScroll: true });
  });
  return <Primitive.Item {...others} id={id()} value={local.value} disabled={local.disabled ?? false} class={cn("sheen-accordion-item", local.class)}>
    <Primitive.Header as={heading()} class="sheen-accordion-heading">
      <Primitive.Trigger as={Button} ref={trigger} data-sheen-accordion-trigger="" id={`${id()}-trigger`} aria-controls={`${id()}-content`} aria-disabled={open() && !options.multiple() && !options.collapsible() || undefined} class="sheen-collapsible-trigger">
        <span class="sheen-collapsible-indicator" aria-hidden="true" />{local.label}
      </Primitive.Trigger>
    </Primitive.Header>
    <div ref={content} id={`${id()}-content`} class="sheen-collapsible-content" data-open={open()} aria-hidden={!open() || undefined} inert={!open()}>
      <div class="sheen-collapsible-clip"><div class="sheen-collapsible-body">{local.children}</div></div>
    </div>
  </Primitive.Item>;
}
