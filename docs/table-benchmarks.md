# DataTable benchmark contract

`pnpm benchmark:table` builds every package and Loupe for production, starts the production preview, and runs five fresh Chromium contexts against `/table-benchmark`. `sheen-benchmark` supplies the same command through `default.nix`. The committed `sheen-table-v2` fixture contains 100,000 immutable rows, six visible columns, three explicit search projections, two multi-sort keys, three representative complex cell renderers, a 1,200 x 800 browser viewport, and a 600px table viewport. It renders the integrated presentation under compact density. Rows are generated before the mount mark. The fixture reads no clock, random source, locale default, network data, or production data.

The measured operations are:

- Initial render starts immediately before the native mount trigger invokes the Solid render path and ends on the animation frame after the first populated row exists.
- Multi-sort activates Status, then Shift+Amount through the real header controls and ends on the frame after both ordered keys are accepted.
- Ranked global search starts at a native input event for `needle` and ends on the frame after exactly 1,000 matching rows are accepted. Search debounce is zero only in this fixture so the processing and render cost is isolated.
- Filter editor setup and debounce are excluded. The filter mark starts when the real Apply control publishes `Name contains Needle` and ends on the frame after exactly 1,000 matching rows are accepted.
- Refresh replaces every row object while retaining stable IDs and changing visible values. The accepted visible row must retain its DOM node, focus, and scroll anchor while displaying the replacement value.
- Resize drives the real Name separator through 60 pointer positions. Browser animation-frame intervals, Long Tasks, and a CDP trace are retained. Fixed-height rows are not measured individually; variable-height rows are.
- Scroll moves the actual table viewport 10,000px over two seconds. The gate uses CDP `DrawFrame` intervals, while browser animation frames remain a diagnostic. Every sampled browser frame must intersect a populated realized row.

Operation medians are divided by a deterministic CPU calibration measured in the same browser context. A normalized median more than 10 percent above the latest versioned baseline fails. Three successive smaller increases warn. Absolute operation values from SPEC section 10.3 are reference values, not product guarantees.

Resize fails when browser p99 frame time exceeds 20ms, a browser frame exceeds 50ms, or a Long Task is reported. The resize CDP stream is diagnostic because the pointer driver deliberately changes content once per input step and `DrawFrame` intervals therefore describe that input cadence. Scroll fails when CDP p99 exceeds 20ms, a CDP frame exceeds 50ms, a Long Task is reported, a blank browser frame is observed, trace data is lost, or too few frame samples arrive.

The initial v2 normalized baseline was bootstrapped from a local five-run production measurement after profiling and records the exact machine and browser source. Its raw medians were 110.5ms render, 101.8ms multi-sort interaction, 62.2ms ranked-search interaction, 27.2ms structured filter, and 62.2ms retained refresh. Direct pipeline profiling separated compute from browser reconciliation and measured the same two-key sort around 35–41ms and ranked search around 33–48ms. The first accepted artifact from the pinned `ubuntu-24.04` CI job should replace the local baseline in a deliberate baseline PR. A Playwright bump is also a deliberate rebaseline. Never update a baseline merely to make an unexplained regression pass.

CI uses Node 24 and Playwright 1.63.0's bundled Chromium in a separate `ubuntu-24.04` job. It uploads `test-results/bench/table-benchmark.json` on success or failure for 30 days. The artifact contains raw runs, calibration values, browser and runner metadata, fixture and baseline versions, frame event counts, warnings, and failures. The runner-class result is the gate; local results diagnose changes but do not prove hosted-runner performance.
