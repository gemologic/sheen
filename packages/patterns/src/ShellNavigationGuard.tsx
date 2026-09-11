import { Dialog, createConfirm, useTheme } from "@gemologic/sheen";
import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { createNavigationGuard } from "./router.ts";
import type { RouterAdapter } from "./router.ts";
import type { UnsavedChangesRegistry } from "./unsaved-changes.ts";

export function ShellNavigationGuard(props: { router: RouterAdapter; unsaved: UnsavedChangesRegistry }): JSX.Element {
  const theme = useTheme();
  const confirm = createConfirm();
  const [failed, setFailed] = createSignal(false);
  const locationKey = createMemo(() => {
    const location = props.router.location();
    return JSON.stringify([location.entryKey ?? null, location.pathname, location.search, location.hash]);
  });
  onMount(() => {
    createEffect(() => {
      const router = props.router;
      // An externally accepted location change invalidates the pending destination.
      locationKey();
      const guard = createNavigationGuard({
        dirty: props.unsaved.dirty,
        confirm: signal => {
          setFailed(false);
          return confirm.confirm({ title: theme.messages().unsavedTitle, description: theme.messages().unsavedDescription,
            confirmLabel: theme.messages().discardChanges, tone: "danger", signal });
        },
        onError: () => setFailed(true),
      });
      const unregister = router.block(guard.handle);
      onCleanup(() => { guard.dispose(); unregister(); });
    });
  });
  return <><confirm.Dialog /><Dialog title={theme.messages().navigationFailed} open={failed()} onOpenChange={setFailed} /></>;
}
