import { connect } from "node:net";
import { expect, test } from "@playwright/test";

async function cancelIncompleteUpload(baseURL: string): Promise<void> {
  const url = new URL(baseURL);
  const socket = connect({ host: url.hostname, port: Number(url.port) });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("error", reject); });
    const continued = new Promise<void>((resolve, reject) => {
      socket.once("data", (chunk: Buffer) => {
        if (chunk.toString().includes("100 Continue")) resolve();
        else reject(new Error("Expected the real server to accept the upload headers"));
      });
    });
    socket.write(`POST /api/optimistic HTTP/1.1\r\nHost: ${url.host}\r\nContent-Type: application/json\r\nContent-Length: 100\r\nExpect: 100-continue\r\n\r\n`);
    await continued;
    await new Promise<void>((resolve, reject) => { socket.write("partial", error => error ? reject(error) : resolve()); });
    const closed = new Promise<void>(resolve => { socket.once("close", () => resolve()); });
    socket.resetAndDestroy();
    await closed;
  } finally { socket.destroy(); }
}

test("a disconnected Nitro upload does not cover another page with Vite's error overlay", async ({ page, request, baseURL }) => {
  if (!baseURL) throw new Error("Expected a real Loupe server");
  const websocketErrors: string[] = [];
  page.on("websocket", socket => {
    socket.on("framereceived", frame => {
      const payload = typeof frame.payload === "string" ? frame.payload : frame.payload.toString();
      if (payload.includes('"type":"error"')) websocketErrors.push(payload);
    });
  });
  await page.goto("/floating");
  await page.getByRole("button", { name: "Open view options", exact: true }).click();
  const input = page.getByRole("textbox", { name: "View name", exact: true });
  await expect(input).toBeFocused();
  await input.fill("Retained while another connection closes");
  await input.evaluate(element => element.setAttribute("data-retained-input", "yes"));
  // Warm the real API, then cancel its body transfer rather than inventing an abort error.
  expect((await request.post("/api/optimistic", { data: { reject: false } })).status()).toBe(200);
  for (let attempt = 0; attempt < 3; attempt++) await cancelIncompleteUpload(baseURL);
  expect((await request.post("/api/optimistic", { data: { reject: false } })).status()).toBe(200);
  expect(websocketErrors).toEqual([]);
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);
  await expect(input).toBeFocused();
  await expect(input).toHaveAttribute("data-retained-input", "yes");
  await expect(input).toHaveValue("Retained while another connection closes");
  await input.fill("Still editable");
});
