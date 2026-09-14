import type { Connect, Plugin } from "vite";

const handleCancellation: Connect.ErrorHandleFunction = (error: unknown, request, response, next) => {
  const code = error instanceof Error && "code" in error ? error.code : null;
  const incompleteRequest = request.destroyed && !request.complete;
  const cancelledRead = error instanceof Error &&
    ((incompleteRequest && error.name === "AbortError") ||
      (request.destroyed && request.errored === error && code === "ECONNRESET" && error.message === "aborted"));
  const cancelledWrite = response.destroyed && code === "ERR_STREAM_PREMATURE_CLOSE";
  if (cancelledRead || cancelledWrite) {
    response.destroy();
    return;
  }
  next(error);
};

/** Classify disconnected requests before Vite broadcasts a dev-server error. */
export function devRequestCancellation(): Plugin {
  return {
    name: "loupe-request-cancellation",
    apply: "serve",
    configureServer(server) {
      return () => { server.middlewares.use(handleCancellation); };
    },
  };
}
