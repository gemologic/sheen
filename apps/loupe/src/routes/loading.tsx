import { createSignal } from "solid-js";
import { Button, EmptyState, Skeleton, Spinner, Stack, ThemeScope } from "@gemologic/sheen";

export default function LoadingFixture() {
  const [light, setLight] = createSignal(false);
  const [filtered, setFiltered] = createSignal(true);
  return <main>
    <h1>Loading primitives</h1>
    <Button onClick={() => setLight(value => !value)}>Toggle theme</Button>
    <ThemeScope theme={light() ? "paper" : "obsidian"} mode={light() ? "light" : "dark"}>
      <Stack aria-label="Cold load placeholders" style={{ padding: "var(--sheen-space-gutter)" }}>
        <Skeleton data-testid="text" />
        <Skeleton shape="rectangle" data-testid="rectangle" />
        <Skeleton shape="circle" data-testid="circle" />
        <Skeleton hidden data-testid="hidden" />
        <Skeleton tabIndex={0} data-testid="inert" />
        <Button>Following action</Button>
        <Spinner label="Loading orders" data-testid="spinner" />
        <Spinner decorative size="sm" data-testid="decorative-spinner" />
        <ThemeScope motion="reduced"><Spinner label="Reduced motion loading" size="lg" data-testid="reduced-spinner" /></ThemeScope>
        <EmptyState kind={filtered() ? "no-results" : "empty"} description="Try another symbol or create an order." data-testid="empty-state">
          <Button onClick={() => setFiltered(false)}>Clear filters</Button>
        </EmptyState>
      </Stack>
    </ThemeScope>
  </main>;
}
