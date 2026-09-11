# Link

`Link` requires `href` and renders a native anchor without a provider dependency. The default `variant="text"` is underlined and uses the accent foreground token. `variant="button"` uses the existing quiet, neutral, medium Button appearance but retains anchor semantics. Both expose the shared surface-offset focus indicator. Native anchor attributes, refs, events, and caller classes pass through.

This follows the [WAI link pattern](https://www.w3.org/WAI/ARIA/apg/patterns/link/): use the browser's anchor behavior instead of adding a link role and reconstructing navigation with keyboard handlers. Enter navigates; Space does not activate. Native target, rel, download, and modified clicks remain available. The component neither imports a router nor intercepts events. Apps may integrate routing through their normal anchor handling. `aria-disabled` alone does not disable a destination; unavailable content should not be rendered as an active destination.

Two SSR tests pass without ThemeProvider. Four Chromium cases pass twice each, covering JavaScript-disabled navigation/new tabs, native keyboard behavior, focus styling, reactive destination/appearance with retained identity, app cancellation, modified-click new tabs, noopener, successful downloads, and server DOM reuse through delayed hydration with single handler execution. UI build, lint/typechecks, and manifest/example validation pass, now at 76 components and 79 examples.

The WebKit selection includes these cases; discovery is not runtime qualification. Reviewed visual matrices, density/RTL coverage, broader router/unsaved-change integration, and the shared public variant/polymorphic seam remain unfinished. This does not close the grouped button-family TODO.
