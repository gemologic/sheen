import { createSignal } from "solid-js";
import { Button, Input } from "@gemologic/sheen";

export default function Route() {
  const [count, setCount] = createSignal(0);
  return <section aria-label="Hydration consumer">
    <Input aria-label="Hydration draft" />
    <Button onClick={() => setCount(value => value + 1)}>Save draft</Button>
    <output aria-label="Save count">{count()}</output>
  </section>;
}
