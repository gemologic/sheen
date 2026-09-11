import { createSignal } from "solid-js";
import { Breadcrumb, Button, Input, Stack, Tabs, ThemeScope } from "@gemologic/sheen";
import { PageHeader } from "@gemologic/sheen-patterns";
import "@gemologic/sheen-patterns/styles.css";

export default function PageHeaderFixture() {
  const [title, setTitle] = createSignal("Orders");
  const [rtl, setRtl] = createSignal(false);
  return <main><h1>Page header qualification</h1><Stack>
    <Button onClick={() => setTitle("Updated orders")}>Refresh title</Button>
    <Button onClick={() => setRtl(value => !value)}>Toggle direction</Button>
    <ThemeScope direction={rtl() ? "rtl" : "ltr"}>
      <PageHeader title={title()} headingLevel={2}
        breadcrumb={<Breadcrumb items={[{ id: "home", label: "Workspace", href: "/shell" }, { id: "orders", label: "Orders" }]} />}
        actions={<><Input label="Header draft" /><Button onClick={() => setTitle("Saved orders")}>Save header</Button></>}
        tabs={<Tabs label="Order views" items={[{ value: "active", label: "Active" }, { value: "archived", label: "Archived" }]}>{value => <span>{value} orders</span>}</Tabs>} />
    </ThemeScope>
    <PageHeader title="Hidden header" hidden />
    <div data-header-matrix style={{ display: "grid", gap: "16px" }}>
      <ThemeScope theme="obsidian" mode="dark"><PageHeader title="Orders" headingLevel={2} actions={<Button>Export</Button>} /></ThemeScope>
      <ThemeScope theme="paper" mode="light" direction="rtl"><PageHeader title="Orders" headingLevel={2} actions={<Button>Export</Button>} /></ThemeScope>
    </div>
  </Stack></main>;
}
