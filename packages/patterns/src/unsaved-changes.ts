import { createContext, createSignal, getOwner, onCleanup, useContext } from "solid-js";
import type { Accessor } from "solid-js";

export interface UnsavedChangesRegistry {
  readonly dirty: Accessor<boolean>;
  readonly register: (dirty: Accessor<boolean>) => () => void;
}

export function createUnsavedChangesRegistry(): UnsavedChangesRegistry {
  const [registrations, setRegistrations] = createSignal<readonly { dirty: Accessor<boolean> }[]>([]);
  return {
    dirty: () => registrations().some(entry => entry.dirty()),
    register(dirty) {
      const entry = { dirty };
      setRegistrations(previous => [...previous, entry]);
      return () => setRegistrations(previous => previous.filter(candidate => candidate !== entry));
    },
  };
}

export const UnsavedChangesContext = createContext<UnsavedChangesRegistry>();

/** Register app-owned dirty state in the nearest AppShell until owner disposal. */
export function useUnsavedChanges(dirty: Accessor<boolean>): void {
  const registry = useContext(UnsavedChangesContext);
  if (!registry || !getOwner()) throw new Error("useUnsavedChanges requires an owner inside AppShell");
  onCleanup(registry.register(dirty));
}
