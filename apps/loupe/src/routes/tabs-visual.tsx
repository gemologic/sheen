import { Grid, Input, Surface, Tabs, ThemeScope } from "@gemologic/sheen";

const items = [{ value: "general", label: "General" }, { value: "advanced", label: "Advanced" }, { value: "disabled", label: "Unavailable", disabled: true }];
function Sample(props: { label: string; orientation?: "horizontal" | "vertical" }) {
  return <Surface padding="lg" bordered>
    <h2>{props.label}</h2>
    <Tabs label={props.label} items={items} orientation={props.orientation ?? "horizontal"}>
      {value => value === "general" ? <Input label="Display name" value="Persistent draft" /> : <p>Advanced preferences remain mounted between visits.</p>}
    </Tabs>
  </Surface>;
}

export default function TabsVisualFixture() {
  return <main><h1>Tabs presentation</h1><Grid columns={2} gap="lg">
    <ThemeScope theme="obsidian" mode="dark"><Sample label="Dark settings" /></ThemeScope>
    <ThemeScope theme="paper" mode="light" direction="rtl"><Sample label="Light RTL settings" /></ThemeScope>
    <ThemeScope theme="obsidian" mode="dark" density="compact"><Sample label="Vertical compact settings" orientation="vertical" /></ThemeScope>
    <ThemeScope theme="contrast" mode="light" density="spacious" motion="reduced"><Sample label="High contrast settings" /></ThemeScope>
  </Grid></main>;
}
