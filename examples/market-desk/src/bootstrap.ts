import { getRequestEvent, isServer } from "solid-js/web";
import { defaultSymbol, findInstrument, parsePriceHistory, priceHistory } from "./lib/market.ts";
import type { PriceHistory } from "./lib/market.ts";

/** The server's clock and the selected instrument's history, serialized so hydration renders identical markup. */
export interface Bootstrap {
  readonly now: number;
  readonly history: PriceHistory;
}

const serverCache = new WeakMap<Request, Bootstrap>();
let clientCache: Bootstrap | undefined;
let historyConsumed = false;

export function selectedSymbol(search: string): string {
  const symbol = new URLSearchParams(search).get("symbol");
  return symbol && findInstrument(symbol) ? symbol : defaultSymbol;
}

export function bootstrap(): Bootstrap {
  if (isServer) {
    const request = getRequestEvent()?.request;
    if (!request) throw new Error("Bootstrap requires a server request");
    const cached = serverCache.get(request);
    if (cached) return cached;
    const now = Date.now();
    const instrument = findInstrument(selectedSymbol(new URL(request.url).search));
    if (!instrument) throw new Error("Missing default instrument");
    const value = { now, history: priceHistory(instrument, now) };
    serverCache.set(request, value);
    return value;
  }
  if (!clientCache) {
    const value: unknown = JSON.parse(document.getElementById("market-bootstrap")?.textContent ?? "null");
    if (typeof value !== "object" || value === null || !("now" in value) || typeof value.now !== "number" || !("history" in value)) throw new Error("Missing server bootstrap");
    clientCache = { now: value.now, history: parsePriceHistory(value.history) };
  }
  return clientCache;
}

/** The serialized history describes the first document only; later selections fetch their own. */
export function initialHistory(): PriceHistory | null {
  if (isServer) return bootstrap().history;
  if (historyConsumed) return null;
  historyConsumed = true;
  return bootstrap().history;
}

export function serializeBootstrap(value: Bootstrap): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
