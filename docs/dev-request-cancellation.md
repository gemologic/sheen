# Development request cancellation

Loupe installs `devRequestCancellation()` after Nitro in its Vite plugins. The returned `configureServer` hook places the error middleware after Nitro's request handler and before Vite's error middleware. This affects the development application only, not the published packages or production server.

Nitro forwards request-handler errors to Vite. Vite broadcasts those errors to every connected client, so one cancelled upload can otherwise cover unrelated pages with an error overlay. Cancellation is normal during navigation, superseded work, and browser-context teardown.

Only two disconnected-connection cases are consumed:

- An incomplete, destroyed incoming request reporting `AbortError`, or Node's `ECONNRESET` with the exact `aborted` message.
- A destroyed outgoing response reporting `ERR_STREAM_PREMATURE_CLOSE`.

All other errors go to the next middleware. Complete-request reset failures and application errors still reach Vite's normal error reporting. The overlay remains enabled, and requests retain their AbortSignal handling.

`tools/dev-request-cancellation.test.ts` starts a real Vite server, resets a partially transmitted TCP upload after the server reads it, and disconnects a real streaming response. It also verifies that complete-request errors and unrelated failures after disconnection remain visible. No network or framework behavior is mocked.

`tests/browser/dev-request-cancellation.spec.ts` repeats the truncated upload against Loupe's real Nitro API while another page retains a focused draft. It checks received HMR frames, absence of overlays, and input identity/focus/editability. Removing the middleware reproduces three broadcast `aborted` errors; installing it preserves the other page.
