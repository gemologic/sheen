# Browser status hooks

Import `useOnlineStatus` and `useIsWindowFocused` from `@gemologic/sheen`, and call them inside a Solid owner. Each returns `Accessor<boolean | undefined>`: undefined during SSR and initial hydration, then the observed browser value after mount. Render an explicit unknown presentation if needed. Neither hook requires a ThemeProvider or owns a request, timer, or shared global store.

`useOnlineStatus` observes navigator.onLine and native online/offline events. This is a browser connectivity hint, not internet reachability or backend health. Do not disable operations solely from this hint. The app still supplies StatusBar's connection state.

`useIsWindowFocused` observes document.hasFocus on window focus/blur and document visibility changes. This reports focus rather than simply whether an element is active. Apps choose whether to pause their own polling. It does not schedule polling itself.

Both hooks remove their event listeners when the owner is disposed. The Loupe `/browser-status` fixture supports disposal/remount and uses the public package exports. Tests cover deterministic SSR without browser globals, delayed hydration retaining the server node, actual browser offline transitions, and fresh state on remount. Native tab-focus qualification uses full Chromium with Playwright's forced-focus override disabled.

References: [HTML online state](https://html.spec.whatwg.org/multipage/system-state.html#dom-navigator-online), [HTML document focus](https://html.spec.whatwg.org/multipage/interaction.html#dom-document-hasfocus).
