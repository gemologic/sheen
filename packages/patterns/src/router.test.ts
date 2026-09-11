import { expect, test } from "vitest";
import { createNavigationGuard } from "./router.ts";
import type { NavigationAttempt } from "./router.ts";

function attempt(to: string) {
  let prevented = false;
  let retries = 0;
  const event: NavigationAttempt = {
    to, get defaultPrevented() { return prevented; },
    preventDefault() { prevented = true; }, retry() { retries++; },
  };
  return { event, retries: () => retries };
}

test("clean navigation and already prevented attempts do not ask for confirmation", () => {
  let confirmations = 0;
  const guard = createNavigationGuard({ dirty: () => false, confirm: async () => { confirmations++; return true; }, onError: error => { throw error; } });
  const clean = attempt("/clean");
  guard.handle(clean.event);
  expect(clean.event.defaultPrevented).toBe(false);
  const blocked = attempt("/blocked");
  blocked.event.preventDefault();
  guard.handle(blocked.event);
  expect(confirmations).toBe(0);
});

test("only the first pending destination is retried on acceptance", async () => {
  let resolve: (accepted: boolean) => void = () => {};
  const decision = new Promise<boolean>(done => { resolve = done; });
  const guard = createNavigationGuard({ dirty: () => true, confirm: () => decision, onError: error => { throw error; } });
  const first = attempt("/first"), second = attempt("/second");
  guard.handle(first.event); guard.handle(second.event);
  expect(first.event.defaultPrevented).toBe(true);
  expect(second.event.defaultPrevented).toBe(true);
  resolve(true); await decision;
  expect(first.retries()).toBe(1);
  expect(second.retries()).toBe(0);
});

test("disposal aborts the prompt and prevents late accepted navigation", async () => {
  let signal: AbortSignal | undefined;
  let resolve: (accepted: boolean) => void = () => {};
  const decision = new Promise<boolean>(done => { resolve = done; });
  const guard = createNavigationGuard({ dirty: () => true, confirm: next => { signal = next; return decision; }, onError: error => { throw error; } });
  const first = attempt("/first");
  guard.handle(first.event); guard.dispose(); guard.dispose();
  expect(signal?.aborted).toBe(true);
  resolve(true); await decision;
  expect(first.retries()).toBe(0);
});

test("rejection reports the error, stays put, and permits a subsequent attempt", async () => {
  const failure = new Error("Confirmation unavailable");
  const errors: unknown[] = [];
  let confirmations = 0;
  const guard = createNavigationGuard({ dirty: () => true, confirm: async () => { if (++confirmations === 1) throw failure; return false; }, onError: error => { errors.push(error); } });
  const first = attempt("/first");
  guard.handle(first.event);
  await Promise.resolve();
  expect(errors).toEqual([failure]);
  guard.handle(first.event);
  expect(confirmations).toBe(1);
  const second = attempt("/second");
  guard.handle(second.event); await Promise.resolve();
  expect(confirmations).toBe(2);
  expect(first.retries() + second.retries()).toBe(0);
});
