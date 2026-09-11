import { For, createSignal } from "solid-js";
import { Button, Center, Cluster, Container, Grid, Input, Row, Spacer, Stack, ThemeScope } from "@gemologic/sheen";

export default function LayoutFixture() {
  const [compact, setCompact] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [columns, setColumns] = createSignal<2 | 3>(2);
  const [hidden, setHidden] = createSignal(false);
  const [activations, setActivations] = createSignal(0);
  return <main>
    <h1>Layout primitives</h1>
    <Row aria-label="Fixture controls">
      <Button onClick={() => setCompact(value => !value)}>Toggle density</Button>
      <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
      <Button onClick={() => setColumns(value => value === 2 ? 3 : 2)}>Toggle columns</Button>
      <Button onClick={() => setHidden(value => !value)}>Toggle hidden</Button>
    </Row>
    <Grid columns={3} gap="lg" class="layout-gallery">
      <For each={["obsidian", "paper", "contrast"]}>{theme =>
        <ThemeScope theme={theme} mode={theme === "obsidian" ? "dark" : "light"} density={compact() ? "compact" : "comfortable"} direction={rtl() ? "rtl" : "ltr"} motion="reduced" class="layout-sample">
          <Container data-container class="layout-container">
            <Stack data-stack>
              <h2>{theme}</h2>
              <Grid columns={columns()} data-grid>
                <Input label={`${theme} first name`} />
                <Input label={`${theme} last name`} />
                <Input label={`${theme} reference`} />
              </Grid>
              <Row data-row wrap={false}>
                <Button>First</Button><Spacer data-spacer /><Button onClick={() => setActivations(value => value + 1)}>Last</Button>
              </Row>
              <Cluster data-cluster style={{ "max-inline-size": "180px" }}>
                <Button variant="outline">Review</Button><Button variant="outline">Archive</Button><Button variant="outline">Download</Button>
              </Cluster>
              <Center data-center style={{ "block-size": "80px" }}><span>Centered content</span></Center>
              <Stack hidden={hidden()} data-hidden><span>Hideable content</span></Stack>
              <output aria-live="polite">Activations {activations()}</output>
            </Stack>
          </Container>
        </ThemeScope>
      }</For>
    </Grid>
  </main>;
}
