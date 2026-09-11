import { createSignal } from "solid-js";
import { Breadcrumb, Button, Input, Stack, ThemeScope } from "@gemologic/sheen";

export default function BreadcrumbFixture() {
  const [label, setLabel] = createSignal("Workspace");
  const [rtl, setRtl] = createSignal(false);
  return <main><h1>Breadcrumb qualification</h1><Stack>
    <Input label="Draft" />
    <Button onClick={() => setLabel(value => value === "Workspace" ? "Updated workspace" : "Workspace")}>Refresh ancestor label</Button>
    <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
    <ThemeScope direction={rtl() ? "rtl" : "ltr"}>
      <Breadcrumb items={[{ id: "workspace", label: label(), href: "/breadcrumb#workspace" }, { id: "projects", label: "Projects", href: "/breadcrumb#projects" }, { id: "current", label: "Current project" }]} />
    </ThemeScope>
    <ThemeScope theme="paper" mode="light" direction="rtl" messages={{ breadcrumb: "Page hierarchy" }}>
      <Breadcrumb items={[{ id: "root", label: "Home", href: "/" }, { id: "reading", label: "A very long current page title that must wrap instead of overflowing the narrow viewport" }]} />
    </ThemeScope>
  </Stack></main>;
}
