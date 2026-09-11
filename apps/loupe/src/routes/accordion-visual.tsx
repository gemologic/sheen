import { Accordion, AccordionItem, Grid, Input, Surface, ThemeScope } from "@gemologic/sheen";

function Sample(props: { label: string }) {
  return <Surface padding="lg" bordered>
    <h2>{props.label}</h2>
    <Accordion role="group" aria-label={props.label} defaultValue={["general"]}>
      <AccordionItem value="general" label="General settings"><Input label="Display name" value="Persistent draft" /></AccordionItem>
      <AccordionItem value="advanced" label="Advanced settings">Advanced preferences</AccordionItem>
      <AccordionItem value="disabled" label="Unavailable settings" disabled>Unavailable preferences</AccordionItem>
    </Accordion>
  </Surface>;
}

export default function AccordionVisualFixture() {
  return <main><h1>Accordion presentation</h1><Grid columns={2} gap="lg">
    <ThemeScope theme="obsidian" mode="dark"><Sample label="Dark settings" /></ThemeScope>
    <ThemeScope theme="paper" mode="light" direction="rtl" motion="reduced"><Sample label="Light RTL settings" /></ThemeScope>
  </Grid></main>;
}
