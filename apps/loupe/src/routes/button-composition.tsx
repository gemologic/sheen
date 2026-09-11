import { Button, Dialog, buttonVariants, cn } from "@gemologic/sheen";

export default function ButtonCompositionFixture() {
  return <main>
    <Button variant="solid" tone="danger" size="sm">Wrapped action</Button>
    <button type="button" class={buttonVariants({ variant: "solid", tone: "danger", size: "sm" })}>Composed action</button>
    <button type="button" class={cn(buttonVariants({ size: "lg" }), "min-h-0 px-0")}>Overridden action</button>
    <Button variant="outline">Outlined action</Button>
    <Dialog title="Composed dialog" trigger="Open composed dialog">Dialog content</Dialog>
  </main>;
}
