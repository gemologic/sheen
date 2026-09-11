import { For, Show, Switch as MatchSwitch, Match, createMemo, createSignal } from "solid-js";
import { Badge, Button, Heading, Link, SearchInput, SegmentedControl, Select, Table, TableBody, TableCaption, TableCell, TableHead, TableHeaderCell, TableRow, Text, useTheme } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { useThemeTokens } from "@gemologic/sheen-charts";
import { accentNames, isAccentName, simulateColorVision } from "@gemologic/sheen-tokens";
import type { ColorVisionSimulation, Mode, TokenName } from "@gemologic/sheen-tokens";
import {
  apcaMatrixScore,
  backgroundTokenNames,
  filterTokenCatalog,
  foregroundTokenNames,
  tokenCatalog,
  tokenPreviewKind,
  wcagMatrixScore,
} from "../token-explorer-state.ts";

const modes: readonly SelectOption[] = [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "System" }];
const simulations: readonly (ColorVisionSimulation | "normal")[] = ["normal", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"];
const requestedTokens = tokenCatalog.map(item => item.cssName);
const initialTokenLimit = 48;
const tokenPageSize = 48;
const primitiveTokenCount = tokenCatalog.filter(item => item.tier === 1).length;
const semanticTokenCount = tokenCatalog.length - primitiveTokenCount;
type ExplorerView = "tokens" | "contrast" | "palettes";

const explorerViews = [
  { value: "tokens", label: "Token catalog" },
  { value: "contrast", label: "Contrast" },
  { value: "palettes", label: "Chart palettes" },
] as const;

function isMode(value: string | null): value is Mode | "system" {
  return value === "dark" || value === "light" || value === "system";
}

function isExplorerView(value: string | null): value is ExplorerView {
  return value === "tokens" || value === "contrast" || value === "palettes";
}

function TokenPreview(props: { readonly value: string }) {
  const kind = createMemo(() => tokenPreviewKind(props.value));
  const style = () => `--loupe-token-value:${props.value}`;
  return <span class="loupe-token-preview" data-kind={kind()} style={style()} aria-hidden="true">
    <MatchSwitch fallback={<span>Aa</span>}>
      <Match when={kind() === "color"}><span class="loupe-token-preview-color" /></Match>
      <Match when={kind() === "length"}><span class="loupe-token-preview-length" /></Match>
      <Match when={kind() === "shadow"}><span class="loupe-token-preview-shadow" /></Match>
    </MatchSwitch>
  </span>;
}

function ratio(values: Readonly<Record<string, string>>, foreground: TokenName, background: TokenName): number | undefined {
  try { return wcagMatrixScore(values, foreground, background); }
  catch { return undefined; }
}

function lightnessContrast(values: Readonly<Record<string, string>>, foreground: TokenName, background: TokenName): number | undefined {
  try { return apcaMatrixScore(values, foreground, background); }
  catch { return undefined; }
}

function formatLightnessContrast(value: number | undefined): string {
  if (value === undefined) return "pending";
  if (value === 0) return "Lc 0.0";
  return `Lc ${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

export default function TokenExplorer() {
  const theme = useTheme();
  const values = useThemeTokens(requestedTokens);
  const [query, setQuery] = createSignal("");
  const [view, setView] = createSignal<ExplorerView>("tokens");
  const [tokenLimit, setTokenLimit] = createSignal(initialTokenLimit);
  const filtered = createMemo(() => [...filterTokenCatalog(query())].sort((first, second) => first.tier === second.tier ? 0 : first.tier === 2 ? -1 : 1));
  const visibleTokens = createMemo(() => filtered().slice(0, tokenLimit()));
  const chartColors = createMemo(() => Array.from({ length: 8 }, (_, index) => values()[`--sheen-chart-${index + 1}`] ?? "transparent"));
  const changeQuery = (value: string): void => {
    setQuery(value);
    setTokenLimit(initialTokenLimit);
  };
  return <main class="loupe-token-explorer">
    <header class="loupe-token-explorer-heading">
      <div><span class="loupe-eyebrow">Theme diagnostics</span><Heading level={1}>Token explorer</Heading><Text tone="muted">Inspect the live design-system contract: resolved values, component consumers, accessibility diagnostics, and chart behavior under the active theme.</Text></div>
      <Link href="/theme-editor" variant="button" class="loupe-token-editor-link">Open theme editor</Link>
    </header>
    <section class="loupe-token-overview" aria-label="Token explorer summary">
      <dl>
        <div><dt>Catalog</dt><dd>{tokenCatalog.length}</dd></div>
        <div><dt>Semantic</dt><dd>{semanticTokenCount}</dd></div>
        <div><dt>Primitive</dt><dd>{primitiveTokenCount}</dd></div>
      </dl>
      <SegmentedControl name="token-explorer-view" label="Inspector view" options={explorerViews} value={view()} onValueChange={value => { if (isExplorerView(value)) setView(value); }} />
    </section>
    <section class="loupe-token-explorer-controls" aria-label="Theme preview controls">
      <Select label="Theme" value={theme.state().theme} options={theme.themes().map(item => ({ value: item.id, label: item.label }))} onValueChange={value => {
        if (value && theme.themes().some(item => item.id === value)) void theme.set({ theme: value });
      }} />
      <Select label="Accent" value={theme.state().accent} options={accentNames.map(value => ({ value, label: value }))} onValueChange={value => {
        if (value && isAccentName(value)) void theme.set({ accent: value });
      }} />
      <Select label="Mode" value={theme.state().mode} options={modes} onValueChange={value => { if (isMode(value)) void theme.set({ mode: value }); }} />
    </section>
    <Show when={view() === "tokens"}><section class="loupe-token-catalog" aria-labelledby="token-list-heading">
      <div class="loupe-token-catalog-toolbar"><SearchInput label="Filter tokens or consuming component" value={query()} onValueChange={changeQuery} />
        <output aria-label="Visible token count">{visibleTokens().length} shown · {filtered().length} matching · {tokenCatalog.length} total</output>
      </div>
      <div class="loupe-token-section-heading"><div><Heading id="token-list-heading" level={2}>Resolved tokens</Heading><Text tone="muted">Semantic tokens are shown first. Search also matches the manifest components that consume each token.</Text></div></div>
      <div class="loupe-token-list">
        <For each={visibleTokens()}>{item => {
          const value = () => values()[item.cssName] ?? "pending";
          return <article class="loupe-token-item" data-token={item.cssName} data-tier={item.tier}>
            <div class="loupe-token-item-heading"><Badge tone="neutral">Tier {item.tier}</Badge><code>{item.cssName}</code></div>
            <output title={value()} aria-label={`${item.cssName} computed value`}>{value()}</output>
            <Show when={value() !== "pending"}><TokenPreview value={value()} /></Show>
            <p>{item.consumers.length ? item.consumers.join(", ") : item.tier === 1 ? "No direct component consumers; resolved by the theme compiler" : "No manifest consumer declared"}</p>
          </article>;
        }}</For>
      </div>
      <Show when={visibleTokens().length < filtered().length}><Button class="loupe-token-load-more" variant="outline" onClick={() => setTokenLimit(limit => limit + tokenPageSize)}>Show {Math.min(tokenPageSize, filtered().length - visibleTokens().length)} more tokens</Button></Show>
      <Show when={filtered().length === 0}><Text class="loupe-token-empty" tone="muted">No token names or manifest consumers match this filter.</Text></Show>
    </section></Show>
    <Show when={view() === "contrast"}><section class="loupe-token-diagnostic-panel" aria-labelledby="contrast-matrix-heading">
      <Heading id="contrast-matrix-heading" level={2}>Foreground by background contrast</Heading>
      <Text tone="muted">WCAG 2.2 ratios below 4.5:1 are flagged as diagnostics. Role-specific exemptions and 3:1 non-text gates still come from the token compiler. Signed APCA Lc values preserve text/background polarity and are diagnostic only, not conformance gates.</Text>
      <div class="loupe-token-matrix-scroll" role="region" aria-label="Foreground by background contrast matrix" tabIndex={0}>
        <Table>
          <TableCaption>Every semantic foreground token against every semantic background token</TableCaption>
          <TableHead><TableRow><TableHeaderCell>Foreground</TableHeaderCell><For each={backgroundTokenNames}>{background => <TableHeaderCell><code>{background}</code></TableHeaderCell>}</For></TableRow></TableHead>
          <TableBody><For each={foregroundTokenNames}>{foreground => <TableRow>
            <TableHeaderCell scope="row"><code>{foreground}</code></TableHeaderCell>
            <For each={backgroundTokenNames}>{background => {
              const score = createMemo(() => ratio(values(), foreground, background));
              const perceptualScore = createMemo(() => lightnessContrast(values(), foreground, background));
              const pass = (): "true" | "false" | undefined => {
                const current = score();
                return current === undefined ? undefined : current >= 4.5 ? "true" : "false";
              };
              const formatted = (): string => {
                const current = score();
                return current === undefined ? "pending" : `${current.toFixed(2)}:1`;
              };
              return <TableCell data-wcag-pass={pass()}>
                <span style={{ color: `var(--sheen-${foreground})`, background: `var(--sheen-${background})` }}>Aa</span>
                <output aria-label={`${foreground} on ${background} WCAG ratio`}>{formatted()}</output>
                <small><output aria-label={`${foreground} on ${background} APCA lightness contrast`}>{formatLightnessContrast(perceptualScore())}</output></small>
              </TableCell>;
            }}</For>
          </TableRow>}</For></TableBody>
        </Table>
      </div>
      <p class="loupe-token-apca-note">APCA 0.0.98G-4g diagnostics are calculated by the MIT-licensed Color.js implementation. Positive Lc means dark text on a light background; negative Lc means light text on a dark background. See <a href="https://colorjs.io/docs/contrast#accessible-perceptual-contrast-algorithm-apca">Color.js APCA documentation</a> and <a href="https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html">APCA in a Nutshell</a>.</p>
    </section></Show>
    <Show when={view() === "palettes"}><section class="loupe-token-diagnostic-panel" aria-labelledby="palette-heading">
      <Heading id="palette-heading" level={2}>Chart palette simulations</Heading>
      <Text tone="muted">Compare the eight chart series under common color-vision simulations. These previews update in place when the theme, accent, or mode changes.</Text>
      <div class="loupe-token-palettes"><For each={simulations}>{simulation => <section aria-label={`${simulation} chart palette`}>
        <Heading level={3} size="h4">{simulation}</Heading>
        <div><For each={chartColors()}>{color => {
          const display = () => color === "transparent" || simulation === "normal" ? color : simulateColorVision(color, simulation);
          return <span style={{ background: display() }} title={display()} />;
        }}</For></div>
      </section>}</For></div>
    </section></Show>
  </main>;
}
