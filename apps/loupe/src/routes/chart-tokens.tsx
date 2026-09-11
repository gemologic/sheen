import { Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import { Button, ThemeScope, useTheme } from "@gemologic/sheen";
import { useThemeTokens } from "@gemologic/sheen-charts";
import { invalidateThemeTokens } from "@gemologic/sheen-charts/loupe";

function CanvasToken(props: { readonly label: string }) {
  const colors = useThemeTokens(["--sheen-chart-1", "--sheen-chart-grid"]);
  let canvas: HTMLCanvasElement | undefined;
  createEffect(() => {
    const color = colors()["--sheen-chart-1"];
    const grid = colors()["--sheen-chart-grid"];
    const context = canvas?.getContext("2d");
    if (!context || !color || !grid) return;
    context.clearRect(0, 0, 240, 48);
    context.fillStyle = color;
    context.fillRect(0, 0, 240, 48);
    context.strokeStyle = grid;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(0, 38);
    context.lineTo(240, 10);
    context.stroke();
    canvas?.setAttribute("data-paint-count", String(Number(canvas.getAttribute("data-paint-count") ?? "0") + 1));
  });
  return <section class="loupe-chart-token" role="group" aria-label={props.label}>
    <canvas ref={canvas} width="240" height="48" role="img" aria-label={`${props.label} token canvas`} />
    <output aria-label={`${props.label} resolved token`} data-token-value={colors()["--sheen-chart-1"]}>{colors()["--sheen-chart-1"] || "pending"}</output>
  </section>;
}

function RootControls() {
  const theme = useTheme();
  return <div class="actions">
    <Button onClick={() => void theme.setMode(theme.mode() === "dark" ? "light" : "dark")}>Toggle inherited mode</Button>
    <Button onClick={() => void theme.setTheme(theme.theme() === "obsidian" ? "graphite" : "obsidian")}>Toggle root theme</Button>
  </div>;
}

export default function ChartTokenFixture() {
  const [scopes, setScopes] = createSignal(true);
  let editor: HTMLStyleElement | undefined;
  onMount(() => {
    editor = document.createElement("style");
    editor.setAttribute("data-loupe-token-editor", "");
    document.head.append(editor);
    onCleanup(() => editor?.remove());
  });
  function overrideEditorToken(): void {
    if (!editor) throw new Error("Loupe token editor is not mounted");
    editor.textContent = ".loupe-chart-token-editor { --sheen-chart-1: rgb(255 0 170); }";
    for (let index = 0; index < 20; index++) invalidateThemeTokens();
  }
  return <main class="loupe-chart-token-page">
    <h1>Canvas theme token bridge</h1>
    <RootControls />
    <Button onClick={() => setScopes(value => !value)}>Toggle scoped probes</Button>
    <CanvasToken label="Root" />
    <Show when={scopes()}>
      <ThemeScope theme="paper" class="loupe-chart-token-scope"><CanvasToken label="Inherited paper" /></ThemeScope>
      <ThemeScope theme="graphite" class="loupe-chart-token-editor"><CanvasToken label="Editor override" /><Button onClick={overrideEditorToken}>Apply live token override</Button></ThemeScope>
    </Show>
  </main>;
}
