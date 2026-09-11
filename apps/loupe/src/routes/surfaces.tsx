import { For, Show, createSignal } from "solid-js";
import { Alert, Button, Callout, Card, Grid, Heading, Input, Row, Separator, Stack, Surface, ThemeScope } from "@gemologic/sheen";
import type { CalloutProps, SurfaceProps } from "@gemologic/sheen";
import { themes } from "@gemologic/sheen-tokens";
import type { Mode } from "@gemologic/sheen-tokens";

const variants: NonNullable<SurfaceProps["variant"]>[] = ["base", "subtle", "raised", "inset"];
const tones: NonNullable<CalloutProps["tone"]>[] = ["info", "success", "warning", "danger"];

export default function SurfaceFixture() {
  const [alert, setAlert] = createSignal(false);
  const [variant, setVariant] = createSignal<"raised" | "inset">("raised");
  const [rtl, setRtl] = createSignal(false);
  return <main style={{ "block-size": "100%" }}>
    <Heading level={1}>Surface contracts</Heading>
    <Row><Button onClick={() => setAlert(value => !value)}>Toggle alert</Button><Button onClick={() => setVariant(value => value === "raised" ? "inset" : "raised")}>Change card surface</Button><Button onClick={() => setRtl(value => !value)}>Toggle direction</Button></Row>
    <Show when={alert()}><Alert heading="Refresh failed" data-live-alert>Your last accepted data remains available.</Alert></Show>
    <Grid columns={3} gap="lg">
      <For each={themes}>{theme => <For each={["dark", "light"] satisfies Mode[]}>{mode =>
        <ThemeScope theme={theme.id} mode={mode} direction={rtl() ? "rtl" : "ltr"} motion="reduced" class="surface-sample">
          <Stack gap="md" style={{ padding: "var(--sheen-space-gutter)" }}>
            <Heading level={2} size="h3">{theme.label} / {mode}</Heading>
            <For each={variants}>{surface => <Surface variant={surface} padding="md" bordered>
              <Stack gap="sm"><Input label={`${theme.id}-${mode} ${surface}`} /><Button>Action on {surface}</Button></Stack>
            </Surface>}</For>
            <Surface variant="base" padding="sm"><Card variant={variant()} data-card><Stack gap="sm"><Input label={`${theme.id}-${mode} card`} /><Button>Card action</Button></Stack></Card></Surface>
            <Separator aria-label="Notice section" />
            <Row wrap={false} style={{ "block-size": "30px" }}><span>First</span><Separator orientation="vertical" aria-label="Vertical section" /><span>Second</span><Separator orientation="vertical" decorative data-decorative /></Row>
            <For each={tones}>{tone => <Callout tone={tone} heading={`${tone} context`}><Stack gap="sm"><span>Static information, not an urgent announcement.</span><Button>Action for {tone}</Button></Stack></Callout>}</For>
          </Stack>
        </ThemeScope>
      }</For>}</For>
    </Grid>
  </main>;
}
