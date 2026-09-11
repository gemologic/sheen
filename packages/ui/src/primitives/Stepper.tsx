import { For, Show, createMemo, splitProps } from "solid-js";
import type { Accessor, JSX } from "solid-js";
import { useTheme } from "../theme/ThemeProvider.tsx";
import { cn } from "../utils/cn.ts";
import { Button } from "./Button.tsx";
import { Link } from "./Link.tsx";
import type { WorkflowState } from "./ActivityTimeline.tsx";

interface StepperStepBase {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly state: WorkflowState;
}

export interface StepperStatusStep extends StepperStepBase {
  readonly kind: "status";
}

export interface StepperLinkStep extends StepperStepBase {
  readonly kind: "link";
  readonly href: string;
}

export interface StepperActionStep extends StepperStepBase {
  readonly kind: "action";
  readonly onSelect: () => void;
  readonly disabled?: boolean;
}

export type StepperStep = StepperStatusStep | StepperLinkStep | StepperActionStep;

export interface StepperProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  ref?: HTMLElement | ((element: HTMLElement) => void);
  label: string;
  steps: readonly StepperStep[];
  orientation?: "horizontal" | "vertical";
  density?: "compact" | "default";
  refreshing?: boolean;
}

function StepLabel(props: { readonly step: Accessor<StepperStep> }): JSX.Element {
  const href = (): string => {
    const step = props.step();
    return step.kind === "link" ? step.href : "";
  };
  const actionDisabled = (): boolean => {
    const step = props.step();
    return step.kind === "action" && Boolean(step.disabled);
  };
  const select = (): void => {
    const step = props.step();
    if (step.kind === "action" && !step.disabled) step.onSelect();
  };
  return <Show when={props.step().kind === "link"} fallback={<Show when={props.step().kind === "action"} fallback={<strong>{props.step().label}</strong>}>
    <Button variant="link" disabled={actionDisabled()} onClick={select}>{props.step().label}</Button>
  </Show>}><Link href={href()}>{props.step().label}</Link></Show>;
}

/** A semantic workflow progress list with native link and action variants. */
export function Stepper(props: StepperProps): JSX.Element {
  const theme = useTheme();
  const [local, others] = splitProps(props, ["ref", "class", "label", "steps", "orientation", "density", "refreshing", "aria-label"]);
  const byId = createMemo(() => {
    const result = new Map<string, StepperStep>();
    let currentCount = 0;
    for (const step of local.steps) {
      if (!step.id.trim()) throw new Error("Stepper: step IDs must be nonempty");
      if (result.has(step.id)) throw new Error(`Stepper: duplicate step ID ${JSON.stringify(step.id)}`);
      if (!step.label.trim()) throw new Error(`Stepper: label must be nonempty for ${JSON.stringify(step.id)}`);
      if (step.state === "current") currentCount += 1;
      if (step.kind === "link" && !step.href.trim()) throw new Error(`Stepper: href must be nonempty for ${JSON.stringify(step.id)}`);
      result.set(step.id, step);
    }
    if (currentCount > 1) throw new Error("Stepper: only one step may be current");
    return result;
  });
  const ids = createMemo(() => [...byId().keys()]);
  const completed = createMemo(() => [...byId().values()].filter(step => step.state === "completed").length);
  const stateText = (state: WorkflowState): string => {
    if (state === "completed") return theme.messages().workflowCompleted;
    if (state === "current") return theme.messages().workflowCurrent;
    if (state === "error") return theme.messages().workflowError;
    return theme.messages().workflowUpcoming;
  };
  const marker = (state: WorkflowState, index: number): string => {
    if (state === "completed") return "✓";
    if (state === "current") return "●";
    if (state === "error") return "!";
    return String(index + 1);
  };
  return <nav {...others} ref={element => { if (typeof local.ref === "function") local.ref(element); }} class={cn("sheen-stepper", local.class)} aria-label={local["aria-label"] ?? local.label}
    aria-busy={local.refreshing || undefined} data-orientation={local.orientation ?? "horizontal"} data-density={local.density ?? "default"} data-refreshing={local.refreshing || undefined}>
    <progress class="sheen-stepper-progress" max={Math.max(1, ids().length)} value={completed()} aria-label={theme.messages().stepperProgress.replaceAll("{label}", local.label)} />
    <ol class="sheen-stepper-list"><For each={ids()}>{(id, index) => {
      const step = () => byId().get(id);
      return <Show when={step()}>{current => <li class="sheen-stepper-step" data-step-id={id} data-state={current().state} aria-current={current().state === "current" ? "step" : undefined}>
        <span class="sheen-workflow-marker" data-state={current().state} aria-hidden="true">{marker(current().state, index())}</span>
        <div class="sheen-stepper-copy"><StepLabel step={current} />
          <span class="sheen-workflow-state">{stateText(current().state)}</span>
          <Show when={current().description}>{description => <span class="sheen-stepper-description">{description()}</span>}</Show>
        </div>
      </li>}</Show>;
    }}</For></ol>
  </nav>;
}
