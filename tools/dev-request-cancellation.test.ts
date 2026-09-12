import { connect } from "node:net";
import { PassThrough } from "node:stream";
import { text } from "node:stream/consumers";
import { pipeline } from "node:stream/promises";
import { afterEach, expect, test } from "vitest";
import { createLogger, createServer } from "vite";
import type { ViteDevServer } from "vite";
import { devRequestCancellation } from "../apps/loupe/dev-request-cancellation.ts";

const servers: ViteDevServer[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(server => server.close())); });

async function fixture() {
  let receiveBody: () => void = () => {};
  let forwardError: (error: unknown) => void = () => {};
  const received = new Promise<void>(resolve => { receiveBody = resolve; });
  const forwarded = new Promise<unknown>(resolve => { forwardError = resolve; });
  const errors: string[] = [];
  const logger = createLogger("silent");
  const logError = logger.error.bind(logger);
  logger.error = (message, options) => { errors.push(message); logError(message, options); };
  const server = await createServer({
    configFile: false,
    appType: "custom",
    customLogger: logger,
    optimizeDeps: { noDiscovery: true },
    server: { host: "127.0.0.1", port: 0, watch: null },
    plugins: [{
      name: "real-request-fixture",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url === "/failure") {
            next(new Error("Application failure must remain visible"));
          } else if (request.url === "/reset-failure") {
            next(Object.assign(new Error("aborted"), { code: "ECONNRESET" }));
          } else if (request.url === "/stream") {
            const stream = new PassThrough();
            void pipeline(stream, response).catch((error: unknown) => { next(error); forwardError(error); });
            stream.write("Partial response");
          } else if (request.url === "/upload" || request.url === "/upload-failure") {
            request.once("data", receiveBody);
            void text(request).then(() => { response.end("Accepted"); }).catch((error: unknown) => {
              const failure = request.url === "/upload-failure" ? new Error("Unrelated failure after disconnection") : error;
              next(failure);
              forwardError(failure);
            });
          } else response.end("Healthy");
        });
      },
    }, devRequestCancellation()],
  });
  servers.push(server);
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP dev server");
  return { port: address.port, errors, received, forwarded };
}

async function disconnectUpload(current: Awaited<ReturnType<typeof fixture>>, path: string): Promise<unknown> {
  const socket = connect({ host: "127.0.0.1", port: current.port });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
    socket.write(`POST ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Length: 100\r\n\r\npartial`);
    await current.received;
    socket.resetAndDestroy();
    return await current.forwarded;
  } finally { socket.destroy(); }
}

test("an actual incomplete HTTP upload does not broadcast an error to unrelated Vite clients", async () => {
  const current = await fixture();
  const error = await disconnectUpload(current, "/upload");
  expect(error).toMatchObject({ message: "aborted", code: "ECONNRESET" });
  expect(current.errors).toEqual([]);
  const response = await fetch(`http://127.0.0.1:${current.port}/healthy`);
  expect(await response.text()).toBe("Healthy");
});

test("application errors and reset errors on complete requests still reach Vite", async () => {
  const current = await fixture();
  for (const path of ["/failure", "/reset-failure"]) {
    const response = await fetch(`http://127.0.0.1:${current.port}${path}`);
    expect(response.status).toBe(500);
    expect(await response.text()).toContain(path === "/failure" ? "Application failure must remain visible" : "aborted");
  }
  expect(current.errors).toHaveLength(2);
});

test("disconnecting a real streaming response does not broadcast a premature-close error", async () => {
  const current = await fixture();
  const controller = new AbortController();
  const response = await fetch(`http://127.0.0.1:${current.port}/stream`, { signal: controller.signal });
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Expected a streaming response");
  expect((await reader.read()).done).toBe(false);
  controller.abort();
  expect(await current.forwarded).toMatchObject({ code: "ERR_STREAM_PREMATURE_CLOSE" });
  expect(current.errors).toEqual([]);
});

test("disconnecting a request does not conceal an unrelated application failure", async () => {
  const current = await fixture();
  await disconnectUpload(current, "/upload-failure");
  expect(current.errors).toHaveLength(1);
  expect(current.errors[0]).toContain("Unrelated failure after disconnection");
});
