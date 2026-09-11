import { For, createSignal } from "solid-js";
import { Breadcrumb, Button, Input, NavItem, NavList, Stack } from "@gemologic/sheen";

export default function NavigationRefreshFixture() {
  const [items, setItems] = createSignal(["One", "Two", "Three"]);
  const update = async (transform: (items: string[]) => string[]) => {
    const response = await fetch("/api/optimistic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reject: false }) });
    if (response.ok) setItems(transform);
  };
  return <main><h1>Navigation refresh qualification</h1><Stack>
    <Button onClick={() => update(items => [...items].reverse())}>Reverse links</Button>
    <Button onClick={() => update(items => items.filter(item => item !== "Two"))}>Remove Two</Button>
    <Button onClick={() => update(() => [])}>Clear links</Button>
    <Input label="Outside draft" />
    <NavList label="Dynamic navigation"><For each={items()}>{item => <NavItem href={`#${item}`} label={item} />}</For></NavList>
    <Breadcrumb label="Dynamic path" items={[...items().map(item => ({ id: item, label: item, href: `#${item}` })), { id: "current", label: "Current" }]} />
  </Stack></main>;
}
