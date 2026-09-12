import type { Page } from "@playwright/test";

export interface FrameSample {
  readonly durationMs: number;
  readonly intervals: readonly number[];
  readonly longTasks: readonly number[];
  readonly unexpectedLayoutShift: number;
  readonly unexpectedLayoutShiftSources: readonly string[];
  readonly transientOverlayLayoutShift: number;
}

const stopEventName = "sheen-benchmark-stop";
const markerAttribute = "data-sheen-benchmark-sampling";

/** Acknowledge observer installation directly, without polling on an extra animation frame. */
export async function startFrameSampling(page: Page, options: { readonly separateToastLayoutShift?: boolean } = {}): Promise<void> {
  await page.evaluate(({ stopEventName, markerAttribute, separateToastLayoutShift }) => {
    const root = document.documentElement;
    if (root.hasAttribute(markerAttribute)) throw new Error("A benchmark frame sample is already active");
    const start = performance.now();
    const intervals: number[] = [];
    const longTasks: number[] = [];
    let unexpectedLayoutShift = 0;
    const unexpectedLayoutShiftSources = new Set<string>();
    let transientOverlayLayoutShift = 0;
    let previous: number | undefined;
    let frame: number;

    const collect = (entries: readonly PerformanceEntry[]): void => {
      for (const entry of entries) {
        if (entry.entryType === "longtask") longTasks.push(entry.duration);
        if (entry.entryType !== "layout-shift") continue;
        const serialized: unknown = entry.toJSON();
        if (typeof serialized !== "object" || serialized === null || !("value" in serialized) || !("hadRecentInput" in serialized)) continue;
        if (serialized.hadRecentInput !== false || typeof serialized.value !== "number") continue;
        const rawSources: unknown = Reflect.get(entry, "sources");
        const elements: Element[] = [];
        if (Array.isArray(rawSources)) {
          for (const source of rawSources) {
            if (typeof source !== "object" || source === null) continue;
            const node: unknown = Reflect.get(source, "node");
            if (node instanceof Element) elements.push(node);
          }
        }
        const transient = separateToastLayoutShift && elements.length > 0 && elements.every(node => node.closest(".sheen-toaster") !== null);
        if (transient) transientOverlayLayoutShift += serialized.value;
        else {
          unexpectedLayoutShift += serialized.value;
          for (const node of elements) {
            const id = node.id ? `#${CSS.escape(node.id)}` : "";
            const classes = [...node.classList].slice(0, 3).map(value => `.${CSS.escape(value)}`).join("");
            unexpectedLayoutShiftSources.add(`${node.localName}${id}${classes}`);
          }
        }
      }
    };
    const observer = new PerformanceObserver(list => collect(list.getEntries()));
    const entryTypes = PerformanceObserver.supportedEntryTypes.filter(type => type === "longtask" || type === "layout-shift");
    if (entryTypes.length > 0) observer.observe({ entryTypes });
    const recordFrame = (timestamp: number): void => {
      if (previous !== undefined) intervals.push(timestamp - previous);
      previous = timestamp;
    };
    const sample = (timestamp: number): void => {
      recordFrame(timestamp);
      frame = requestAnimationFrame(sample);
    };
    const isReceiver = (value: unknown): value is (result: FrameSample) => void => typeof value === "function";
    document.addEventListener(stopEventName, event => {
      if (!(event instanceof CustomEvent)) throw new Error("Expected a benchmark sample receiver");
      const receive: unknown = event.detail;
      if (!isReceiver(receive)) throw new Error("Expected a benchmark sample receiver");
      root.setAttribute(markerAttribute, "draining");
      cancelAnimationFrame(frame);
      // Retain the legacy sampler's final rAF drain, including its frame interval.
      frame = requestAnimationFrame(timestamp => {
        recordFrame(timestamp);
        collect(observer.takeRecords());
        observer.disconnect();
        root.removeAttribute(markerAttribute);
        receive({ durationMs: performance.now() - start, intervals, longTasks, unexpectedLayoutShift,
          unexpectedLayoutShiftSources: [...unexpectedLayoutShiftSources], transientOverlayLayoutShift });
      });
    }, { once: true });
    root.setAttribute(markerAttribute, "active");
    frame = requestAnimationFrame(sample);
  }, { stopEventName, markerAttribute, separateToastLayoutShift: options.separateToastLayoutShift ?? false });
}

export async function finishFrameSampling(page: Page): Promise<FrameSample> {
  return page.evaluate(({ stopEventName, markerAttribute }) => {
    if (document.documentElement.getAttribute(markerAttribute) !== "active") throw new Error("No active benchmark frame sample");
    return new Promise<FrameSample>(resolve => {
      document.dispatchEvent(new CustomEvent<(result: FrameSample) => void>(stopEventName, { detail: resolve }));
    });
  }, { stopEventName, markerAttribute });
}
