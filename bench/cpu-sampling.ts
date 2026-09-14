import type { Page } from "@playwright/test";

export const cpuMeasurement = "cdp-task-duration-thread-ticks-v1";

export interface CpuSample<T> {
  readonly value: T;
  readonly taskMs: number;
}

export interface BrowserCpuClock {
  measure<T>(operation: () => Promise<T>): Promise<CpuSample<T>>;
  close(): Promise<void>;
}

export interface CpuBaselineEntry<T> {
  readonly recordedAt: string;
  readonly source: string;
  readonly normalized: T;
}

/** Capture is explicit, local-only, and never counts as regression qualification. */
export function isCpuBaselineCapture(): boolean {
  const capture = process.env.SHEEN_CAPTURE_CPU_BASELINE;
  if (capture !== undefined && capture !== "true" && capture !== "false") throw new Error("SHEEN_CAPTURE_CPU_BASELINE must be true or false");
  if (capture === "true" && (process.env.CI || process.env.GITHUB_ACTIONS)) throw new Error("CPU baseline capture is forbidden in CI");
  return capture === "true";
}

/** Renderer task CPU, not wall time. Same-origin preview work shares this clock. */
export async function createBrowserCpuClock(page: Page): Promise<BrowserCpuClock> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Performance.enable", { timeDomain: "threadTicks" });
  } catch (error) {
    await session.detach();
    throw error;
  }
  let active = false;
  let closed = false;
  const read = async (): Promise<number> => {
    const { metrics } = await session.send("Performance.getMetrics");
    const taskSeconds = metrics.find(metric => metric.name === "TaskDuration")?.value;
    if (taskSeconds === undefined || !Number.isFinite(taskSeconds) || taskSeconds < 0) throw new Error("Chromium did not report a valid thread-time TaskDuration");
    return taskSeconds * 1000;
  };
  return {
    async measure<T>(operation: () => Promise<T>): Promise<CpuSample<T>> {
      if (closed) throw new Error("Browser CPU clock is closed");
      if (active) throw new Error("A browser CPU sample is already active");
      active = true;
      try {
        const before = await read();
        const value = await operation();
        const taskMs = (await read()) - before;
        if (!Number.isFinite(taskMs) || taskMs <= 0) throw new Error("Browser task CPU time did not increase monotonically");
        return Object.freeze({ value, taskMs });
      } finally {
        active = false;
      }
    },
    async close(): Promise<void> {
      if (active) throw new Error("Cannot close an active browser CPU sample");
      if (!closed) {
        closed = true;
        await session.detach();
      }
    },
  };
}
