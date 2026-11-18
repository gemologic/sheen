import { hash32, unit } from "./prng.ts";

/**
 * The synthetic market is a pure function of (instrument, UTC epoch ms). Server history, server order validation,
 * and the client's live feed all sample the same function, so they agree without sharing mutable state.
 */
export interface Instrument {
  readonly symbol: string;
  readonly name: string;
  readonly venue: string;
  readonly tick: number;
  readonly open: number;
  readonly seed: number;
}

const prefixes = ["Axion", "Borealis", "Cinder", "Delta", "Ember", "Fathom", "Gale", "Helix", "Ionic", "Juno", "Kepler", "Lumen", "Meridian", "Nimbus", "Orbit", "Prism", "Quanta", "Radian", "Solace", "Tessera", "Umbra", "Vector", "Wren", "Xenon", "Yonder"] as const;
const industries = ["Dynamics", "Therapeutics", "Logistics", "Semiconductor", "Energy", "Holdings", "Robotics", "Materials", "Networks", "Foods"] as const;
const venues = ["XNAS", "XNYS", "XLON", "XTKS"] as const;

function makeInstruments(): readonly Instrument[] {
  const result: Instrument[] = [];
  const used = new Set<string>();
  for (let index = 0; result.length < 50; index++) {
    const prefix = prefixes[index % prefixes.length] ?? "Axion";
    const industry = industries[hash32(7, index) % industries.length] ?? "Holdings";
    let symbol = `${prefix.slice(0, 3)}${industry.charAt(0)}`.toUpperCase();
    if (used.has(symbol)) symbol = `${prefix.slice(0, 2)}${industry.slice(0, 2)}`.toUpperCase();
    if (used.has(symbol)) continue;
    used.add(symbol);
    const seed = hash32(0x3a7e, index);
    const open = Math.round((8 + unit(seed, 1) ** 2 * 480) * 100) / 100;
    result.push(Object.freeze({ symbol, name: `${prefix} ${industry}`, venue: venues[hash32(9, index) % venues.length] ?? "XNAS", tick: open < 20 ? 0.005 : 0.01, open, seed }));
  }
  return Object.freeze(result);
}

export const instruments = makeInstruments();
export const defaultSymbol = instruments[0]?.symbol ?? "AXID";

export function findInstrument(symbol: string): Instrument | undefined {
  return instruments.find(instrument => instrument.symbol === symbol);
}

export function requireInstrument(symbol: string): Instrument {
  const instrument = findInstrument(symbol);
  if (!instrument) throw new Error(`Unknown instrument ${symbol}`);
  return instrument;
}

const HALT_WINDOW_MS = 30_000;

/** Trading halts are 30-second windows; prices during a halt are absent (NaN), never carried forward. */
export function isHalted(instrument: Instrument, at: number): boolean {
  return unit(instrument.seed + 11, Math.floor(at / HALT_WINDOW_MS)) < 0.05;
}

function roundToTick(value: number, tick: number): number {
  return Math.round(value / tick) * tick;
}

/** Mid price at a millisecond, or NaN while halted. */
export function midPrice(instrument: Instrument, at: number): number {
  if (isHalted(instrument, at)) return Number.NaN;
  const seconds = at / 1_000;
  const phase = unit(instrument.seed, 2) * Math.PI * 2;
  const drift = 0.012 * Math.sin(seconds / 911 + phase) + 0.006 * Math.sin(seconds / 97 + phase * 2) + 0.002 * Math.sin(seconds / 13 + phase * 3);
  const jitter = 0.0006 * (unit(instrument.seed + 3, Math.floor(at / 50)) - 0.5) + 0.0003 * (unit(instrument.seed + 4, Math.floor(at / 16)) - 0.5);
  return roundToTick(instrument.open * (1 + drift + jitter), instrument.tick);
}

export function spread(instrument: Instrument, at: number): number {
  return instrument.tick * (1 + (hash32(instrument.seed + 5, Math.floor(at / 1_000)) % 4));
}

export interface Quote {
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
}

export function quote(instrument: Instrument, at: number): Quote {
  const mid = midPrice(instrument, at);
  if (!Number.isFinite(mid)) return { bid: Number.NaN, ask: Number.NaN, last: Number.NaN };
  const half = spread(instrument, at) / 2;
  const side = unit(instrument.seed + 6, Math.floor(at / 100)) < 0.5 ? -half : half;
  return { bid: roundToTick(mid - half, instrument.tick), ask: roundToTick(mid + half, instrument.tick), last: roundToTick(mid + side, instrument.tick) };
}

export interface BookLevel {
  readonly id: string;
  readonly side: "Bid" | "Ask";
  readonly level: number;
  readonly price: number;
  readonly size: number;
  readonly total: number;
}

export const BOOK_DEPTH = 10;

/** Ten levels per side. Level identity (and therefore row identity) is stable; price and size change. */
export function orderBook(instrument: Instrument, at: number): readonly BookLevel[] {
  const { bid, ask } = quote(instrument, at);
  const bucket = Math.floor(at / 50);
  const asks: BookLevel[] = [];
  const bids: BookLevel[] = [];
  let askTotal = 0;
  let bidTotal = 0;
  for (let level = 0; level < BOOK_DEPTH; level++) {
    const askSize = 100 * (1 + (hash32(instrument.seed + 20 + level, bucket) % 40));
    const bidSize = 100 * (1 + (hash32(instrument.seed + 40 + level, bucket) % 40));
    askTotal += askSize;
    bidTotal += bidSize;
    asks.push({ id: `ask-${level}`, side: "Ask", level, price: roundToTick(ask + level * instrument.tick, instrument.tick), size: askSize, total: askTotal });
    bids.push({ id: `bid-${level}`, side: "Bid", level, price: roundToTick(bid - level * instrument.tick, instrument.tick), size: bidSize, total: bidTotal });
  }
  return [...asks.reverse(), ...bids];
}

export const HISTORY_SECONDS = 120;
export const HISTORY_HZ = 4;

/** Columnar wire history; null encodes a halt gap. */
export interface PriceHistory {
  readonly symbol: string;
  readonly t: readonly number[];
  readonly last: readonly (number | null)[];
  readonly bid: readonly (number | null)[];
  readonly ask: readonly (number | null)[];
}

export function priceHistory(instrument: Instrument, until: number): PriceHistory {
  const step = 1_000 / HISTORY_HZ;
  const end = Math.floor(until / step) * step;
  const t: number[] = [];
  const last: (number | null)[] = [];
  const bid: (number | null)[] = [];
  const ask: (number | null)[] = [];
  for (let at = end - (HISTORY_SECONDS * HISTORY_HZ - 1) * step; at <= end; at += step) {
    const value = quote(instrument, at);
    t.push(at);
    last.push(Number.isFinite(value.last) ? value.last : null);
    bid.push(Number.isFinite(value.bid) ? value.bid : null);
    ask.push(Number.isFinite(value.ask) ? value.ask : null);
  }
  return { symbol: instrument.symbol, t, last, bid, ask };
}

/** Sixty one-second samples ending at `until`, used by the watchlist sparklines. */
export function sparkline(instrument: Instrument, until: number): Float64Array {
  const end = Math.floor(until / 1_000) * 1_000;
  return Float64Array.from({ length: 60 }, (_, index) => midPrice(instrument, end - (59 - index) * 1_000));
}

function nullableNumbers(value: unknown): readonly (number | null)[] {
  if (!Array.isArray(value) || !value.every(item => item === null || typeof item === "number")) throw new Error("Invalid price column");
  return value.map((item: number | null) => item);
}

export function parsePriceHistory(value: unknown): PriceHistory {
  if (typeof value !== "object" || value === null || !("symbol" in value) || typeof value.symbol !== "string" || !("t" in value) || !("last" in value) || !("bid" in value) || !("ask" in value)) throw new Error("Invalid price history");
  const t = nullableNumbers(value.t).map(item => { if (item === null) throw new Error("Invalid timestamp"); return item; });
  const history = { symbol: value.symbol, t, last: nullableNumbers(value.last), bid: nullableNumbers(value.bid), ask: nullableNumbers(value.ask) };
  if ([history.last, history.bid, history.ask].some(column => column.length !== t.length)) throw new Error("Price columns must align");
  for (let index = 1; index < t.length; index++) if ((t[index] ?? 0) <= (t[index - 1] ?? 0)) throw new Error("Timestamps must strictly increase");
  return history;
}
