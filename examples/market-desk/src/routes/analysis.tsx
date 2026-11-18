import { Text } from "@gemologic/sheen";
import { useThemeTokens } from "@gemologic/sheen-charts";
import { createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { bootstrap } from "../bootstrap.ts";
import { useDesk } from "../desk.tsx";
import { normalRates, stormRates, useMarketClock } from "../feed.ts";
import { FLOW_SLOTS, orderFlow } from "../lib/flow.ts";
import type { AnalysisSession } from "../perspective.ts";

type EngineState = "loading" | "ready" | "error";

const placeholder: Record<EngineState, string> = {
  loading: "Loading the Perspective engine…",
  ready: "",
  error: "The analysis engine could not start in this browser. The desk and blotter are unaffected.",
};

/** Tokens whose change means the WebGL charts must re-read Perspective's CSS variables. */
const themeTokens = ["--sheen-color-bg-raised", "--sheen-color-fg", "--sheen-color-accent", "--sheen-chart-1", "--sheen-chart-grid"] as const;

export default function Analysis() {
  const desk = useDesk();
  const clock = useMarketClock(bootstrap().now, () => desk.storm() ? stormRates : normalRates, () => undefined);
  const tokens = useThemeTokens(themeTokens);
  const [state, setState] = createSignal<EngineState>("loading");
  let pivot: HTMLDivElement | undefined;
  let chart: HTMLDivElement | undefined;
  let session: AnalysisSession | undefined;

  onMount(() => {
    const controller = new AbortController();
    onCleanup(() => {
      controller.abort();
      const current = session;
      session = undefined;
      void current?.dispose();
    });
    void (async () => {
      try {
        if (!pivot || !chart) throw new Error("Analysis slots did not mount");
        const { mountAnalysis } = await import("../perspective.ts");
        const mounted = await mountAnalysis({ pivot, chart }, orderFlow(Date.now()), controller.signal);
        if (controller.signal.aborted) { void mounted.dispose(); return; }
        session = mounted;
        setState("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setState("error");
      }
    })();
  });

  // Every book tick publishes the whole bounded flow; Perspective's index turns it into in-place row updates.
  createEffect(on(clock.book, at => { session?.update(orderFlow(at)); }, { defer: true }));
  createEffect(on(tokens, () => { session?.restyle(); }, { defer: true }));

  return <div class="md-analysis">
    <section class="md-panel md-analysis-panel" aria-labelledby="analysis-heading" aria-describedby="analysis-description">
      <header>
        <div>
          <h2 id="analysis-heading">Order flow analysis</h2>
          <Text id="analysis-description" tone="muted" size="caption">
            {FLOW_SLOTS} simulated desk orders, keyed by a stable ID and streamed into Perspective on every book tick ({desk.storm() ? stormRates.book : normalRates.book} Hz).
            The grid pivots filled quantity and marked notional by instrument and side; the chart sums notional by venue and side.
          </Text>
        </div>
      </header>
      <div class="md-analysis-body" data-state={state()} aria-busy={state() === "loading"}>
        <figure class="md-psp-region" aria-labelledby="pivot-caption">
          <figcaption id="pivot-caption">Fills by instrument and side</figcaption>
          <div ref={pivot} class="md-psp-slot" data-testid="analysis-pivot" />
        </figure>
        <figure class="md-psp-region" aria-labelledby="chart-caption">
          <figcaption id="chart-caption">Marked notional by venue and side</figcaption>
          <div ref={chart} class="md-psp-slot" data-testid="analysis-chart" />
        </figure>
        <p class="md-psp-placeholder" role="status" data-testid="analysis-status">{placeholder[state()]}</p>
      </div>
    </section>
  </div>;
}
