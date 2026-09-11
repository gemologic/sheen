import { createSignal } from "solid-js";
import { Button, DescriptionDetails, DescriptionList, DescriptionTerm, Input, Row, Surface, ThemeScope } from "@gemologic/sheen";

export default function DescriptionListFixture() {
  const [columns, setColumns] = createSignal(false);
  const [rtl, setRtl] = createSignal(false);
  const [light, setLight] = createSignal(false);
  return <main>
    <h1>Description list</h1>
    <Row>
      <Button onClick={() => setColumns(value => !value)}>Toggle layout</Button>
      <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
      <Button onClick={() => setLight(value => !value)}>Toggle theme</Button>
    </Row>
    <ThemeScope theme={light() ? "paper" : "obsidian"} mode={light() ? "light" : "dark"} direction={rtl() ? "rtl" : "ltr"} motion="reduced">
      <Surface padding="lg" data-description-sample>
        <DescriptionList aria-label="Order details" layout={columns() ? "columns" : "stacked"}>
          <DescriptionTerm>Symbol</DescriptionTerm><DescriptionDetails>BTC</DescriptionDetails>
          <DescriptionTerm>Quantity</DescriptionTerm><DescriptionDetails numeric>1.25</DescriptionDetails>
          <DescriptionTerm>Reference</DescriptionTerm><DescriptionDetails>{"LongReference".repeat(30)}</DescriptionDetails>
          <DescriptionTerm>Notes</DescriptionTerm><DescriptionDetails><Input label="Order notes" /></DescriptionDetails>
          <DescriptionTerm hidden>Internal</DescriptionTerm><DescriptionDetails hidden>Not displayed</DescriptionDetails>
        </DescriptionList>
      </Surface>
    </ThemeScope>
  </main>;
}
