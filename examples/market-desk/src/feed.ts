import { createSignal, onCleanup, onMount } from "solid-js";
import type { Accessor } from "solid-js";

export interface FeedRates {
  /** Chart samples per second (at most one per animation frame). */
  readonly chart: number;
  /** Order book and blotter publications per second. */
  readonly book: number;
  /** Watchlist publications per second. */
  readonly watch: number;
}

export const normalRates: FeedRates = { chart: 30, book: 10, watch: 4 };
export const stormRates: FeedRates = { chart: 60, book: 20, watch: 20 };

export interface MarketClock {
  readonly book: Accessor<number>;
  readonly watch: Accessor<number>;
  /** Publications per second over the last full second, across all subsystems. */
  readonly publications: Accessor<number>;
}

/**
 * One requestAnimationFrame driver for the whole desk. The market is a pure function of time, so each subsystem only
 * needs to know when to sample. rAF pauses in background tabs, and the driver stops with its Solid owner.
 */
export function useMarketClock(start: number, rates: Accessor<FeedRates>, onChartFrame: (at: number) => void): MarketClock {
  const [book, setBook] = createSignal(start);
  const [watch, setWatch] = createSignal(start);
  const [publications, setPublications] = createSignal(0);
  onMount(() => {
    let frame = 0;
    let lastChart = 0;
    let lastBook = 0;
    let lastWatch = 0;
    let windowStart = performance.now();
    let count = 0;
    const due = (now: number, last: number, hz: number) => now - last >= 1_000 / hz - 2;
    const tick = (now: number): void => {
      const current = rates();
      const at = Date.now();
      if (due(now, lastChart, current.chart)) { lastChart = now; onChartFrame(at); count++; }
      if (due(now, lastBook, current.book)) { lastBook = now; setBook(at); count++; }
      if (due(now, lastWatch, current.watch)) { lastWatch = now; setWatch(at); count++; }
      if (now - windowStart >= 1_000) { setPublications(Math.round(count * 1_000 / (now - windowStart))); windowStart = now; count = 0; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    onCleanup(() => cancelAnimationFrame(frame));
  });
  return { book, watch, publications };
}
