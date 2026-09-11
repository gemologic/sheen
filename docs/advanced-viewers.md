# Advanced viewers

`DiffViewer`, `LogViewer`, and `JSONViewer` are separate `@gemologic/sheen-code` entries. Each shares a small dependency-free fixed-row virtualization core, but importing one does not retain CodeBlock, Shiki, or the other product packages.

```tsx
import { DiffViewer } from "@gemologic/sheen-code/diff-viewer";
import { LogViewer } from "@gemologic/sheen-code/log-viewer";
import { JSONViewer } from "@gemologic/sheen-code/json-viewer";
import "@gemologic/sheen-code/styles.css";
```

All three render complete deterministic headers during SSR and only the first viewport plus overscan. Hydration retains that viewport and its visible rows. Scrolling updates a bounded window while `aria-posinset` and `aria-setsize` preserve each visible line's position in the complete filtered result.

Search is a 100 ms line filter. It keeps the accepted source untouched, resets the viewport to the first match, and announces matching versus total lines. Copy always uses the complete accepted snapshot, not only the realized or filtered window. Clipboard failures are exposed through `onCopyError`; raw error text is never rendered.

`DiffViewer` uses an exact LCS line diff for ordinary files. Pathological inputs switch to a linear positional diff once the comparison would exceed 250,000 matrix cells, avoiding quadratic memory growth. Added and removed lines have `+`/`-` prefixes and explicit accessible labels, so color is supplementary.

`LogViewer` accepts structured entries with stable IDs, app-owned timestamp strings, explicit levels, messages, and optional details. It does no transport, redaction, or persistence. Applications must remove secrets and sensitive command lines before values reach the browser.

`JSONViewer` accepts JSON values rather than JSON source text. It rejects cycles, nonfinite numbers, functions, symbols, bigint, more than 100,000 values, and excessive depth. Object keys sort by default so copied diagnostics are deterministic.

Viewer input is capped at 1,000,000 rows and 10,000,000 characters. `initialHeight` must be 120 to 1200 CSS pixels and `lineHeight` 16 to 48 pixels. These limits bound memory and DOM behavior; they are not a substitute for server-side log retention or artifact downloads.
