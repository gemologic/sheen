/** Stateless 32-bit integer hash. The same (seed, index) pair always yields the same value on server and client. */
export function hash32(seed: number, index: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(index + 0x632be5ab, 0xc2b2ae35);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

/** Uniform value in [0, 1) derived from hash32. */
export function unit(seed: number, index: number): number {
  return hash32(seed, index) / 4_294_967_296;
}

export function pick<T>(values: readonly [T, ...T[]], seed: number, index: number): T {
  return values[hash32(seed, index) % values.length] ?? values[0];
}

export function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}
