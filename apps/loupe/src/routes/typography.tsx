import { For, createSignal } from "solid-js";
import { Badge, Button, Code, Grid, Heading, Input, Kbd, Row, Stack, Tag, Text, ThemeScope } from "@gemologic/sheen";
import type { StatusTone } from "@gemologic/sheen";
import { themes } from "@gemologic/sheen-tokens";
import type { Mode } from "@gemologic/sheen-tokens";

const tones: StatusTone[] = ["neutral", "accent", "info", "success", "warning", "danger", "market-up", "market-down", "market-flat"];

export default function TypographyFixture() {
  const [size, setSize] = createSignal<"ui" | "body">("ui");
  const [removals, setRemovals] = createSignal(0);
  return <main>
    <span data-font-probe aria-hidden="true" style={{ position: "absolute", "inset-inline-start": "-10000px", "white-space": "nowrap", "font-size": "32px" }}>0123456789 MWmw IBM Plex measurement</span>
    <Heading level={1}>Typography and status</Heading>
    <Button onClick={() => setSize(value => value === "ui" ? "body" : "ui")}>Toggle text role</Button>
    <Text data-class-override class="text-[length:var(--sheen-text-h2-size)] text-fg-muted">Consumer class override</Text>
    <Grid columns={3} gap="lg" class="typography-gallery">
      <For each={themes}>{theme => <For each={["dark", "light"] satisfies Mode[]}>{mode =>
        <ThemeScope theme={theme.id} mode={mode} motion="reduced" class="typography-sample" {...(theme.id === "paper" ? { messages: { remove: "Entfernen" } } : {})}>
          <Stack gap="md" style={{ padding: "var(--sheen-space-gutter)" }}>
            <Heading level={2} size="h3">{theme.label} / {mode}</Heading>
            <Text size={size()} data-body>Stable text, changing type role.</Text>
            <Text tone="muted" size="caption" data-muted>Secondary information remains readable.</Text>
            <Text numeric data-number>12,345.67</Text>
            <Row><Code>workspace.id</Code><Kbd aria-label="Control K">Ctrl K</Kbd></Row>
            <Input label={`${theme.id}-${mode} note`} />
            <For each={tones}>{tone => <Row data-status-row>
              <Badge tone={tone} variant="soft">{tone}</Badge>
              <Badge tone={tone} variant="solid">{tone}</Badge>
              <Badge tone={tone} variant="outline">{tone}</Badge>
            </Row>}</For>
            <Row>
              <Tag label="Review" tone="info" onRemove={() => setRemovals(value => value + 1)} />
              <Tag label="Locked" disabled onRemove={() => setRemovals(value => value + 1)} />
              <Tag label="Static" />
            </Row>
            <Row><Tag label="Solid" variant="solid" tone="accent" onRemove={() => setRemovals(value => value + 1)} /><Tag label="Outline" variant="outline" onRemove={() => setRemovals(value => value + 1)} /></Row>
            <output aria-live="polite">Removal requests {removals()}</output>
          </Stack>
        </ThemeScope>
      }</For>}</For>
    </Grid>
  </main>;
}
