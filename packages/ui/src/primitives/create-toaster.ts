import { createSignal, getOwner, onCleanup } from "solid-js";
import type { Accessor } from "solid-js";

/** An ephemeral handle belonging to the controller that created it. */
export type ToastId = symbol;
/** Internal presenter lease, intentionally absent from the package root exports. */
export const toasterPresenter = Symbol("sheen toaster presenter");
export interface ToastAction {
  readonly label: string;
  readonly run: () => void | Promise<void>;
  /** Safe, app-localized text. Raw rejection values are never display copy. */
  readonly errorMessage: string;
  readonly retryLabel?: string;
}
export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  readonly tone?: "neutral" | "success" | "warning" | "danger";
  readonly priority?: "polite" | "assertive";
  /** Visible lifetime in milliseconds; null means persistent. */
  readonly duration?: number | null;
  readonly action?: ToastAction;
}
export interface ToastNotification {
  readonly id: ToastId;
  readonly options: Readonly<ToastOptions & {
    tone: NonNullable<ToastOptions["tone"]>;
    priority: NonNullable<ToastOptions["priority"]>;
    duration: number | null;
  }>;
  readonly state: "idle" | "pending" | "failed";
  readonly error?: unknown;
}
export type ToastActionResult = { readonly status: "succeeded" } | { readonly status: "failed"; readonly error: unknown } | { readonly status: "ignored" };
export interface ToastController {
  readonly [toasterPresenter]: () => () => void;
  readonly notifications: Accessor<readonly ToastNotification[]>;
  readonly show: (options: ToastOptions) => ToastId;
  /** Replace the whole message and invalidate any previous action completion. */
  readonly update: (id: ToastId, options: ToastOptions) => boolean;
  readonly dismiss: (id: ToastId) => boolean;
  readonly clear: () => void;
  readonly runAction: (id: ToastId) => Promise<ToastActionResult>;
}

function snapshot(options: ToastOptions): ToastNotification["options"] {
  if (!options.title.trim()) throw new Error("Toast: title must be nonempty");
  if (options.action && (!options.action.label.trim() || !options.action.errorMessage.trim())) {
    throw new Error("Toast: action label and error message must be nonempty");
  }
  if (options.action?.retryLabel !== undefined && !options.action.retryLabel.trim()) throw new Error("Toast: retry label must be nonempty");
  const tone = options.tone ?? "neutral";
  const duration = options.duration === undefined ? (options.action || tone === "danger" || tone === "warning" ? null : 5000) : options.duration;
  if (duration !== null && (!Number.isFinite(duration) || duration <= 0 || duration > 2_147_483_647)) {
    throw new Error("Toast: duration must be null or a positive finite browser timer duration");
  }
  const result = { ...options, tone, priority: options.priority ?? "polite", duration };
  return Object.freeze(options.action ? { ...result, action: Object.freeze({ ...options.action }) } : result);
}

/** Owner-local notification state. No global queue, DOM, timer, or transport is created. */
export function createToaster(): ToastController {
  if (!getOwner()) throw new Error("createToaster requires a Solid owner");
  const [notifications, setNotifications] = createSignal<readonly ToastNotification[]>(Object.freeze([]));
  const executions = new Map<ToastId, symbol>();
  let disposed = false;
  let claimed = false;
  const find = (id: ToastId) => notifications().find(notification => notification.id === id);
  const replace = (notification: ToastNotification) => {
    setNotifications(current => Object.freeze(current.map(item => item.id === notification.id ? Object.freeze(notification) : item)));
  };
  const clear = () => { executions.clear(); setNotifications(Object.freeze([])); };
  const dismiss = (id: ToastId): boolean => {
    if (!find(id)) return false;
    executions.delete(id);
    setNotifications(current => Object.freeze(current.filter(notification => notification.id !== id)));
    return true;
  };
  onCleanup(() => { disposed = true; clear(); });

  async function runAction(id: ToastId): Promise<ToastActionResult> {
    const notification = find(id);
    const action = notification?.options.action;
    if (disposed || !notification || !action || notification.state === "pending") return { status: "ignored" };
    const execution = Symbol("toast action");
    executions.set(id, execution);
    replace({ id, options: notification.options, state: "pending" });
    try {
      await action.run();
      if (disposed || executions.get(id) !== execution) return { status: "ignored" };
      dismiss(id);
      return { status: "succeeded" };
    } catch (error) {
      if (disposed || executions.get(id) !== execution) return { status: "ignored" };
      executions.delete(id);
      replace({ id, options: notification.options, state: "failed", error });
      return { status: "failed", error };
    }
  }

  return Object.freeze({
    [toasterPresenter](): () => void {
      if (disposed) throw new Error("Cannot mount a disposed toast controller");
      if (claimed) throw new Error("A toast controller can have only one Toaster presenter");
      claimed = true;
      return () => { claimed = false; };
    },
    notifications,
    show(options: ToastOptions): ToastId {
      if (disposed) throw new Error("Cannot show a toast after its owner is disposed");
      const resolved = snapshot(options);
      const id = Symbol("sheen toast");
      const notification: ToastNotification = Object.freeze({ id, options: resolved, state: "idle" });
      setNotifications(current => Object.freeze([...current, notification]));
      return id;
    },
    update(id: ToastId, options: ToastOptions): boolean {
      if (disposed || !find(id)) return false;
      const resolved = snapshot(options);
      executions.delete(id);
      replace({ id, options: resolved, state: "idle" });
      return true;
    },
    dismiss,
    clear,
    runAction,
  });
}
