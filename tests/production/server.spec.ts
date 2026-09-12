import { expect, test } from "@playwright/test";

for (const path of ["/", "/admin", "/components", "/composer", "/tokens", "/table-benchmark", "/chart-benchmark", "/loading-state"]) {
  test(`production SSR renders ${path} without client JavaScript`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status(), await response.text()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("<main");
    expect(html).toContain("data-hk=");
    expect(html).not.toContain("Cannot read properties of undefined");
  });
}

test("production request handlers keep concurrent theme responses isolated", async ({ request }) => {
  const states = [
    { mode: "dark", theme: "obsidian", accent: "jade" },
    { mode: "light", theme: "slate", accent: "rose" },
  ];
  await Promise.all(states.map(async state => {
    const response = await request.post("/api/theme", { data: state });
    expect(response.status()).toBe(200);
    const returned: unknown = await response.json();
    expect(returned).toMatchObject(state);
    const encoded = response.headers()["set-cookie"]?.match(/^sheen=([^;]+)/u)?.[1];
    if (!encoded) throw new Error("Theme response did not set its cookie");
    const cookie: unknown = JSON.parse(decodeURIComponent(encoded));
    expect(cookie).toMatchObject(state);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const document = await request.get("/cookie", { headers: { cookie: `sheen=${encodeURIComponent(JSON.stringify(state))}` } });
    expect(document.status()).toBe(200);
    const root = (await document.text()).match(/<html\b[^>]*>/u)?.[0];
    expect(root).toContain(`data-sheen-mode="${state.mode}"`);
    expect(root).toContain(`data-sheen-theme="${state.theme}"`);
    expect(root).toContain(`data-sheen-accent="${state.accent}"`);
  }));
});
