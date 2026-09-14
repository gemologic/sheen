# Development request cancellation

Loupe installs `devRequestCancellation()` after Nitro in its Vite plugins. The returned `configureServer` hook places the error middleware after Nitro's request handler and before Vite's error middleware. This affects the development application only, not the published packages or production server.

Nitro forwards request-handler errors to Vite. Vite broadcasts those errors to every connected client, so one cancelled upload can otherwise cover unrelated pages with an error overlay. Cancellation is normal during navigation, superseded work, and browser-context teardown.

Only these disconnected-connection cases are consumed:

- An incomplete, destroyed incoming request reporting `AbortError`.
- A destroyed incoming request reporting Node's `ECONNRESET` with the exact `aborted` message, where the forwarded error is that request stream's actual `errored` value. This includes fully parsed bodies that are still unread when the connection closes. `request.complete` means HTTP parsing finished, not that the application consumed the body or completed its response.
- A destroyed outgoing response reporting `ERR_STREAM_PREMATURE_CLOSE`.

All other errors go to the next middleware. Application-authored reset failures still reach Vite's normal error reporting, even after a real disconnect and even when their code and message match the native cancellation. The overlay remains enabled, and requests retain their AbortSignal handling.

`tools/dev-request-cancellation.test.ts` starts a real Vite server, resets partially transmitted and parsed-but-unread TCP uploads, and disconnects a real streaming response. It also verifies that application errors and unrelated failures after disconnection remain visible, including a separate error with the exact native cancellation signature. No network or framework behavior is mocked.

`tests/browser/dev-request-cancellation.spec.ts` cancels complete bodies against Loupe's cold Nitro API and repeats complete and truncated uploads after warming it, while another page retains a focused draft. It checks received HMR frames, absence of overlays, and input identity/focus/editability.
