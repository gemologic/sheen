import { createSignal } from "solid-js";
import { Button, Input, NavItem, NavList, Stack, Surface, ThemeScope } from "@gemologic/sheen";

export default function NavListFixture() {
  const [label, setLabel] = createSignal("Activity");
  const [current, setCurrent] = createSignal("overview");
  return <main><h1>Navigation list qualification</h1><Stack>
    <Button onClick={() => setLabel("Updated activity")}>Refresh navigation</Button>
    <Input label="Retained draft" />
    <Surface padding="lg" bordered>
      <NavList label="Workspace">
        <NavItem href="#overview" label="Overview" current={current() === "overview"} onClick={() => setCurrent("overview")} />
        <NavItem href="#activity" label={label()} current={current() === "activity"} onClick={() => setCurrent("activity")} />
        <NavItem href="/nav-list#reference" label="Open reference" target="_blank" rel="noopener" />
      </NavList>
    </Surface>
    <ThemeScope theme="paper" mode="light" direction="rtl"><Surface padding="lg" bordered>
      <NavList label="Scoped workspace">
        <NavItem href="#scoped-overview" label="Scoped overview" current />
        <NavItem href="#scoped-activity" label="Scoped activity" />
      </NavList>
    </Surface></ThemeScope>
  </Stack></main>;
}
