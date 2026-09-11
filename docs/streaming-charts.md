# Streaming chart ownership

Import `useStreamingSeries` from `@gemologic/sheen-charts/streaming`. The dedicated renderer-free entry measures 2,346 gzip bytes and is gated below 6,000 bytes. It retains neither uPlot nor the D3 SVG layer. Pass `stream.data()` to `TimeSeries`; the chart remains the renderer and the stream remains the producer-facing data owner.

```tsx
const stream = useStreamingSeries({
  capacity: 1_000,
  interval: 16,
  series,
  initial: acceptedHistory,
});

stream.append(timestampMs, reusableValues);

<TimeSeries
  label="Request rate"
  summary="The latest accepted request samples."
  xLabel="Time"
  series={series}
  data={stream.data()}
  x={{ type: "time", tz: "UTC" }}
  height={240}
/>
```

`capacity` is a positive safe integer. `interval` is the minimum publication interval in milliseconds; zero still coalesces synchronous producer work onto the next animation frame. Series definitions are fixed for the owner lifetime. A sample carries a finite UTC epoch-millisecond timestamp and one reusable `Float64Array` in declared-series order. Values are finite or `NaN`. The buffer copies values during the call, so the producer may reuse its sample array. Malformed timestamps, dimensions, or values throw descriptive errors. Duplicate or older timestamps return `{ kind: "rejected", reason: "out-of-order" }`, increment `rejected`, and do not schedule publication.

The write path allocates its timestamp, series, and presented-state rings once. `append()` creates no array, object, callback, or Promise. Publication happens at most once per eligible animation frame and creates one immutable, chronologically ordered `ChartData` snapshot. This keeps an accepted chart snapshot from being mutated behind the renderer. `appendBatch()` validates the complete columnar boundary once, reuses one scratch vector, and returns aggregate accepted/rejected counts.

When a full ring overwrites already-presented history, that is ordinary bounded retention and does not increment `dropped`. If a producer wraps the ring far enough to overwrite a sample before any frame could publish it, `dropped` increments. The next snapshot always contains the newest `capacity` accepted samples. Initial history is validated, bounded to its newest samples, and treated as already presented, so initialization does not manufacture producer-drop counts.

Disposing the Solid owner cancels its pending timeout and animation frame. The controller then rejects append, batch, and clear operations. There is no automatic visual warning for counters; applications may project `dropped` and `rejected` into their own status bar.

Three buffer tests and three hook tests cover wrap order, unseen versus presented eviction, `NaN`, unordered input, malformed input, clearing, bounded SSR initialization, columnar batches, and disposal. Five Chromium cases exercise a real 60 Hz producer, synchronous overflow, uPlot and table identity, delayed hydration, owner cleanup, and axe. The 60 Hz case proves the local fixture lifecycle, not the calibrated chart performance gate or non-Chromium behavior.
