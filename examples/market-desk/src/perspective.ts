import perspective from "@perspective-dev/client";
import type { Client, ColumnType, Table } from "@perspective-dev/client";
import perspectiveViewer from "@perspective-dev/viewer";
import type { HTMLPerspectiveViewerElement, ViewerConfigUpdate } from "@perspective-dev/viewer";
import "@perspective-dev/viewer-datagrid";
import "@perspective-dev/viewer-charts";
import "@perspective-dev/viewer/dist/css/pro.css";
import SERVER_WASM from "@perspective-dev/server/dist/wasm/perspective-server.wasm?url";
import CLIENT_WASM from "@perspective-dev/viewer/dist/wasm/perspective-viewer.wasm?url";
import type { FlowOrder } from "./lib/flow.ts";

/**
 * Browser-only Perspective session for the Analysis route. This module registers custom elements and fetches WASM
 * on import, so the route loads it with a dynamic import after hydration and never on the server.
 */

/** The theme name declared in app.css; it maps Sheen semantic tokens onto Perspective's variables. */
const THEME = "Sheen";
const TABLE = "order-flow";

const schema: Record<keyof FlowOrder, ColumnType> = {
  id: "string", symbol: "string", venue: "string", side: "string", status: "string",
  quantity: "integer", filled: "integer", price: "float", notional: "float", updated: "datetime",
};

const pivotConfig: ViewerConfigUpdate = {
  table: TABLE, theme: THEME, plugin: "Datagrid", settings: false, title: "Fills by instrument and side",
  group_by: ["symbol"], split_by: ["side"], columns: ["filled", "notional"],
  aggregates: { filled: "sum", notional: "sum" }, sort: [["symbol", "asc"]],
  // Fills and notional are unsigned magnitudes; the theme's market up/down cell colors would imply direction.
  columns_config: { filled: { fg_mode: "disabled" }, notional: { fg_mode: "disabled" } },
};

const chartConfig: ViewerConfigUpdate = {
  table: TABLE, theme: THEME, plugin: "Y Bar", settings: false, title: "Marked notional by venue and side",
  group_by: ["venue"], split_by: ["side"], columns: ["notional"], aggregates: { notional: "sum" },
};

// WASM registration is page-global inside Perspective, so it happens once per document.
let engine: Promise<void> | undefined;
function initEngine(): Promise<void> {
  engine ??= (async () => {
    perspective.init_server(fetch(SERVER_WASM));
    await perspectiveViewer.init_client(fetch(CLIENT_WASM));
  })();
  return engine;
}

export interface AnalysisSession {
  /** Publishes a tick. Returns false when the previous update is still in flight and this one was skipped. */
  readonly update: (rows: readonly FlowOrder[]) => boolean;
  /** Re-reads CSS variables after a Sheen theme, mode, or accent change so WebGL charts repaint. */
  readonly restyle: () => void;
  readonly dispose: () => Promise<void>;
}

export interface AnalysisTargets {
  readonly pivot: HTMLElement;
  readonly chart: HTMLElement;
}

/**
 * Mounts both viewers into the given slots. If `signal` aborts mid-mount, everything created so far is torn down
 * and the promise rejects with the abort reason.
 */
export async function mountAnalysis(targets: AnalysisTargets, rows: readonly FlowOrder[], signal: AbortSignal): Promise<AnalysisSession> {
  // Teardown runs in reverse creation order: viewers release their views before the table, the table before the worker.
  const teardown: (() => Promise<void> | void)[] = [];
  const dispose = async (): Promise<void> => {
    for (const step of teardown.splice(0).reverse()) await step();
  };
  try {
    await initEngine();
    signal.throwIfAborted();
    const client: Client = await perspective.worker();
    teardown.push(() => client.terminate());
    signal.throwIfAborted();
    const table: Table = await client.table(schema, { index: "id", name: TABLE });
    teardown.push(() => table.delete());
    await table.update([...rows]);
    signal.throwIfAborted();
    const viewers = await Promise.all([mountViewer(targets.pivot, client, pivotConfig, teardown), mountViewer(targets.chart, client, chartConfig, teardown)]);
    signal.throwIfAborted();

    let inFlight = false;
    let disposed = false;
    return {
      update(next) {
        if (inFlight || disposed) return false;
        inFlight = true;
        table.update([...next]).catch((error: unknown) => { if (!disposed) console.error(error); }).finally(() => { inFlight = false; });
        return true;
      },
      restyle() {
        if (disposed) return;
        for (const viewer of viewers) void viewer.restyleElement();
      },
      async dispose() {
        disposed = true;
        await dispose();
      },
    };
  } catch (error) {
    await dispose();
    throw error;
  }
}

async function mountViewer(slot: HTMLElement, client: Client, config: ViewerConfigUpdate, teardown: (() => Promise<void> | void)[]): Promise<HTMLPerspectiveViewerElement> {
  const viewer = document.createElement("perspective-viewer");
  viewer.className = "md-psp";
  slot.append(viewer);
  teardown.push(async () => { await viewer.delete(); viewer.remove(); });
  await viewer.resetThemes([THEME]);
  await viewer.load(client);
  await viewer.restore(config);
  return viewer;
}
