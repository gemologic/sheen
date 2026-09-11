import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";
import { noComputedStyle } from "./no-computed-style.js";
import { noDirectPrimitiveImport } from "./no-direct-primitive-import.js";
import { noNativeControl } from "./no-native-control.js";
import { noPropsDestructure } from "./no-props-destructure.js";
import { requireClassMerge } from "./require-class-merge.js";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-native-control", noNativeControl, {
  valid: [
    { filename: "/app/src/View.tsx", code: "const view = <Button>Save</Button>;" },
    { filename: "/repo/packages/ui/src/Button.tsx", code: 'const view = <button type="button">Save</button>;' },
  ],
  invalid: [
    { filename: "/app/src/View.tsx", code: 'const view = <button type="button">Save</button>;', errors: [{ messageId: "forbidden", data: { name: "button" } }] },
    { filename: "/app/src/View.tsx", code: 'const view = <input aria-label="Search" />;', errors: [{ messageId: "forbidden", data: { name: "input" } }] },
  ],
});

tester.run("no-direct-primitive-import", noDirectPrimitiveImport, {
  valid: [
    { filename: "/repo/packages/ui/src/Select.tsx", code: 'import { Select } from "@kobalte/core/select";' },
    { filename: "/repo/packages/table/src/DataTable.tsx", code: 'import { createTable } from "@tanstack/solid-table";' },
    { filename: "/repo/packages/charts/src/TimeSeries.tsx", code: 'import uPlot from "uplot";' },
    { filename: "/app/src/View.tsx", code: 'import { DataTable } from "@gemologic/sheen-table";' },
  ],
  invalid: [
    { filename: "/app/src/View.tsx", code: 'import { Dialog } from "@kobalte/core/dialog";', errors: [{ messageId: "forbidden" }] },
    { filename: "/repo/packages/ui/src/Grid.tsx", code: 'import { createTable } from "@tanstack/solid-table";', errors: [{ messageId: "forbidden" }] },
    { filename: "/app/src/chart.ts", code: 'async function load() { return import("uplot"); }', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-props-destructure", noPropsDestructure, {
  valid: [
    "function Card(props: { title: string }) { return <h2>{props.title}</h2>; }",
    'function Card(props: { title: string }) { const [local] = splitProps(props, ["title"]); return <h2>{local.title}</h2>; }',
  ],
  invalid: [
    { code: "function Card(props: { title: string }) { const { title } = props; return <h2>{title}</h2>; }", errors: [{ messageId: "forbidden" }] },
    { code: "const Card = ({ title }: { title: string }) => <h2>{title}</h2>;", errors: [{ messageId: "forbidden" }] },
    { code: "function Card(props: { title?: string }) { const { title } = mergeProps({ title: 'x' }, props); return <h2>{title}</h2>; }", errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("require-class-merge", requireClassMerge, {
  valid: [
    'interface CardProps { title: string } function Card(props: CardProps) { return <section>{props.title}</section>; }',
    'interface CardProps extends JSX.HTMLAttributes<HTMLElement> {} function Card(props: CardProps) { return <section class={cn("card", props.class)} />; }',
    'interface CardProps { class?: string } function Card(props: CardProps) { return <section class={cn("card", props.class)} />; } interface TitleProps { class?: string } function Title(props: TitleProps) { return <h2 class={cn("title", props.class)} />; }',
  ],
  invalid: [
    { code: 'interface CardProps extends JSX.HTMLAttributes<HTMLElement> {} function Card(props: CardProps) { return <section class="card" />; }', errors: [{ messageId: "forbidden" }] },
    { code: 'interface CardProps { class?: string } function Card(props: CardProps) { return <section class={props.class} />; }', errors: [{ messageId: "forbidden" }] },
    { code: 'interface CardProps { class?: string } function Card(props: CardProps) { return <section class={cn("card", props.class)} />; } interface TitleProps { class?: string } function Title(props: TitleProps) { return <h2 class={props.class} />; }', errors: [{ messageId: "forbidden" }] },
  ],
});

tester.run("no-computed-style", noComputedStyle, {
  valid: [
    { filename: "/repo/packages/charts/src/theme-tokens.ts", code: "const style = browser.getComputedStyle(probe);" },
    { filename: "/app/src/View.tsx", code: "const colors = useThemeTokens();" },
  ],
  invalid: [
    { filename: "/app/src/View.tsx", code: "const style = getComputedStyle(element);", errors: [{ messageId: "forbidden" }] },
    { filename: "/app/src/View.tsx", code: "const style = window.getComputedStyle(element);", errors: [{ messageId: "forbidden" }] },
  ],
});
