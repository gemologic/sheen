import type { Accessor } from "solid-js";

export interface RouterLocation {
  /** Stable per history entry. Omit only when the adapter cannot supply entry identity. */
  readonly entryKey?: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
}

export interface NavigationOptions {
  readonly replace?: boolean;
  readonly state?: unknown;
  readonly scroll?: boolean;
}

export interface NavigationAttempt {
  readonly to: string | number;
  readonly defaultPrevented: boolean;
  readonly preventDefault: () => void;
  /** Retry this exact attempt, bypassing only this registration once. */
  readonly retry: () => void;
}

/** An app-injected adapter. Registration disposal must invalidate outstanding retries. */
export interface RouterAdapter {
  readonly location: Accessor<RouterLocation>;
  readonly navigate: (to: string | number, options?: NavigationOptions) => void;
  readonly block: (listener: (attempt: NavigationAttempt) => void) => () => void;
}

export interface NavigationGuardOptions {
  readonly dirty: Accessor<boolean>;
  readonly confirm: (signal: AbortSignal) => Promise<boolean>;
  readonly onError: (error: unknown) => void;
}

/** First pending attempt wins. Later attempts are blocked without replacing its destination. */
export function createNavigationGuard(options: NavigationGuardOptions) {
  let disposed = false;
  let pending: AbortController | undefined;
  return {
    handle(attempt: NavigationAttempt): void {
      if (disposed || attempt.defaultPrevented) return;
      if (!options.dirty() && !pending) return;
      attempt.preventDefault();
      if (pending) return;
      const controller = new AbortController();
      pending = controller;
      void (async () => {
        try {
          const accepted = await options.confirm(controller.signal);
          if (!disposed && !controller.signal.aborted && accepted) {
            pending = undefined;
            attempt.retry();
          }
        } catch (error) {
          if (!disposed && !controller.signal.aborted) options.onError(error);
        } finally {
          if (pending === controller) pending = undefined;
        }
      })();
    },
    dispose(): void {
      disposed = true;
      pending?.abort();
      pending = undefined;
    },
  };
}
