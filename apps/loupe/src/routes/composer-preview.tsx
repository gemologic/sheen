import { ThemeScope } from "@gemologic/sheen";
import { createSignal, onCleanup, onMount } from "solid-js";
import type { ThemeState } from "@gemologic/sheen";
import { defaultThemeState } from "@gemologic/sheen";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import { createComposerFixtures, defaultComposerDocument } from "../composer/fixtures.ts";
import { ComposerPreview } from "../composer/renderer.tsx";
import { readComposerStateMessage } from "../composer/protocol.ts";
import type { ComposerDropMessage, ComposerPreviewMessage } from "../composer/protocol.ts";
import { reconcileComposerDocument } from "../composer/model.ts";
import type { ComposerDocument } from "../composer/model.ts";

const fixtures = createComposerFixtures("northstar-v1");

function send(message: ComposerPreviewMessage): void {
  window.parent.postMessage(message, window.location.origin);
}

export default function ComposerPreviewRoute() {
  const router = useSolidRouterAdapter();
  const [document, setDocument] = createSignal<ComposerDocument>(defaultComposerDocument);
  const [theme, setTheme] = createSignal<ThemeState>(defaultThemeState);
  const [selectedId, setSelectedId] = createSignal<string>();
  let revision = -1;
  let root: HTMLDivElement | undefined;
  let cleanupDrag: (() => void) | undefined;

  const focusNode = (id: string): void => {
    queueMicrotask(() => root?.querySelector<HTMLElement>(`[data-composer-node-id="${CSS.escape(id)}"]`)?.focus());
  };

  onMount(() => {
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      const state = readComposerStateMessage(event.data);
      if (!state || state.revision < revision) return;
      revision = state.revision;
      setDocument(current => reconcileComposerDocument(current, state.document));
      setTheme(state.theme);
      setSelectedId(state.selectedId);
      if (state.focusId) focusNode(state.focusId);
    };
    window.addEventListener("message", receive);
    send({ kind: "sheen-composer-ready" });
    void import("../composer/drag.ts").then(module => {
      if (!root) return undefined;
      return module.bindComposerPreviewDrag(root, document, (message: ComposerDropMessage) => send(message));
    }).then(cleanup => { cleanupDrag?.(); cleanupDrag = cleanup; });
    onCleanup(() => { cleanupDrag?.(); window.removeEventListener("message", receive); });
  });

  return <ThemeScope {...theme()} controllable class="loupe-composer-preview-scope">
    <div ref={root} class="loupe-composer-preview" data-composer-preview-root>
      <ComposerPreview document={document()} fixtures={fixtures} router={router} {...(selectedId() === undefined ? {} : { selectedId: selectedId() })} onSelect={id => {
        setSelectedId(id);
        send({ kind: "sheen-composer-select", id });
      }} />
    </div>
  </ThemeScope>;
}
