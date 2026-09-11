import { useParams } from "@solidjs/router";
import { Dynamic } from "solid-js/web";
import { For, Show, createEffect, createMemo, createSignal, on } from "solid-js";
import { Button, Code, Heading, Input, Link, Stack, Surface, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, Text } from "@gemologic/sheen";
import { componentDocs } from "../../generated/component-docs.ts";
import type { ComponentControl, ComponentDoc, ComponentDocProp } from "../../generated/component-docs.ts";
import { componentExamples } from "../../generated/component-examples/index.ts";
import type { ComponentExampleModule, PlaygroundValue } from "../../generated/component-examples/index.ts";

const defaultOption = "__sheen_component_default__";

function jsxValue(name: string, value: PlaygroundValue): string {
  if (typeof value === "string") return `${name}=${JSON.stringify(value)}`;
  if (typeof value === "boolean") return value ? name : `${name}={false}`;
  return `${name}={${String(value)}}`;
}

function renderedCode(examples: ComponentExampleModule, values: Readonly<Record<string, PlaygroundValue>>): string {
  const offset = examples.codeInsertionOffset;
  if (offset === null) return examples.playgroundTemplate;
  const attributes = Object.entries(values).sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => jsxValue(name, value));
  const insertion = attributes.length ? ` ${attributes.join(" ")}` : "";
  return `${examples.playgroundTemplate.slice(0, offset)}${insertion}${examples.playgroundTemplate.slice(offset)}`;
}

function selectOptions(control: ComponentControl): readonly { readonly value: string; readonly label: string; readonly data?: PlaygroundValue }[] {
  const fallback = { value: defaultOption, label: "Component default" };
  if (control.kind === "boolean") return [fallback, { value: "boolean-true", label: "true", data: true }, { value: "boolean-false", label: "false", data: false }];
  if (control.kind === "select") return [fallback, ...control.values.map((data, index) => ({ value: `option-${index}`, label: String(data), data }))];
  return [fallback];
}

function currentOption(control: ComponentControl, value: PlaygroundValue | undefined): string {
  if (value === undefined) return defaultOption;
  return selectOptions(control).find(option => option.data === value)?.value ?? defaultOption;
}

function PlaygroundControl(props: {
  readonly prop: ComponentDocProp;
  readonly value: PlaygroundValue | undefined;
  readonly change: (value: PlaygroundValue | undefined) => void;
}) {
  const control = () => props.prop.control;
  return <Show when={control()}>{selected => <div class="loupe-playground-control">
    <Show when={selected().kind === "text"} fallback={<label>
      <span>{props.prop.name}</span>
      <select value={currentOption(selected(), props.value)} onChange={event => {
        const option = selectOptions(selected()).find(candidate => candidate.value === event.currentTarget.value);
        props.change(option?.data);
      }}>
        <For each={selectOptions(selected())}>{option => <option value={option.value}>{option.label}</option>}</For>
      </select>
    </label>}>
      <Input label={props.prop.name} value={typeof props.value === "string" ? props.value : ""} placeholder="Component default" onInput={event => props.change(event.currentTarget.value || undefined)} />
    </Show>
    <Button size="xs" onClick={() => props.change(undefined)}>Reset</Button>
  </div>}</Show>;
}

function ComponentPage(props: { readonly doc: ComponentDoc; readonly examples: ComponentExampleModule }) {
  const [values, setValues] = createSignal<Readonly<Record<string, PlaygroundValue>>>({ ...props.examples.defaults });
  createEffect(on(() => props.doc.name, () => setValues({ ...props.examples.defaults }), { defer: true }));
  const controls = createMemo(() => props.examples.controlsSupported ? props.doc.props.filter(prop => prop.control) : []);
  const code = createMemo(() => renderedCode(props.examples, values()));
  const change = (name: string, value: PlaygroundValue | undefined) => setValues(current => value === undefined
    ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== name))
    : { ...current, [name]: value });
  return <main class="loupe-component-doc">
    <Stack gap="xl">
      <header class="loupe-doc-heading">
        <Link href="/components">All components</Link>
        <Heading level={1}>{props.doc.name}</Heading>
        <Text>{props.doc.summary}</Text>
        <Text tone="muted" size="caption">{props.doc.package} · {props.doc.category}</Text>
      </header>

      <section aria-labelledby="playground-heading">
        <Heading id="playground-heading" level={2}>Playground</Heading>
        <div class="loupe-playground">
          <div class="loupe-playground-controls">
            <Show when={controls().length} fallback={<Text tone="muted">This example has no scalar controls. Its validated source remains interactive below.</Text>}>
              <For each={controls()}>{prop => <PlaygroundControl prop={prop} value={values()[prop.name]} change={value => change(prop.name, value)} />}</For>
            </Show>
          </div>
          <Surface variant="raised" padding="lg" bordered class="loupe-playground-preview" data-playground-preview>
            <Dynamic component={props.examples.playground} values={values()} />
          </Surface>
        </div>
        <pre class="loupe-code-output" aria-label="Generated example code"><code>{code()}</code></pre>
      </section>

      <section aria-labelledby="variants-heading">
        <Heading id="variants-heading" level={2}>Variant matrix</Heading>
        <div class="loupe-variant-grid">
          <For each={props.examples.examples}>{example => <Surface variant="subtle" padding="md" bordered>
            <Text size="caption" tone="muted">{example.title}</Text>
            <div class="loupe-variant-preview"><Dynamic component={example.render} /></div>
          </Surface>}</For>
          <For each={props.examples.variants}>{variant => <Surface variant="subtle" padding="md" bordered>
            <Text size="caption" tone="muted">{variant.label}</Text>
            <div class="loupe-variant-preview"><Dynamic component={props.examples.playground} values={variant.values} /></div>
          </Surface>}</For>
        </div>
      </section>

      <section aria-labelledby="anatomy-heading" class="loupe-doc-columns">
        <div><Heading id="anatomy-heading" level={2}>Anatomy</Heading>
          <dl class="loupe-anatomy">
            <dt>Package</dt><dd><Code>{props.doc.package}</Code></dd>
            <dt>Source</dt><dd><Code>{props.doc.source}</Code></dd>
            <dt>Tokens</dt><dd><Show when={props.doc.tokens.length} fallback={<Text tone="muted">None</Text>}><ul><For each={props.doc.tokens}>{token => <li><Code>{token}</Code></li>}</For></ul></Show></dd>
          </dl>
        </div>
        <div><Heading level={2}>Accessibility</Heading>
          <Text><strong>Role:</strong> {props.doc.a11y.role}</Text>
          <Text><strong>Keyboard:</strong> {props.doc.a11y.keyboard.join(", ") || "No component-owned keys"}</Text>
          <h3>Do</h3><ul><For each={props.doc.guidance.do}>{item => <li>{item}</li>}</For></ul>
          <h3>Do not</h3><ul><For each={props.doc.guidance.dont}>{item => <li>{item}</li>}</For></ul>
        </div>
      </section>

      <section aria-labelledby="props-heading">
        <Heading id="props-heading" level={2}>Generated props</Heading>
        <Table aria-label={`${props.doc.name} authored props`} striped>
          <TableHead><TableRow><TableHeaderCell>Name</TableHeaderCell><TableHeaderCell>Type</TableHeaderCell><TableHeaderCell>Default</TableHeaderCell><TableHeaderCell>Description</TableHeaderCell></TableRow></TableHead>
          <TableBody><For each={props.doc.props}>{prop => <TableRow>
            <TableHeaderCell scope="row"><Code>{prop.name}</Code>{prop.required ? " *" : ""}</TableHeaderCell>
            <TableCell><Code>{prop.type}</Code></TableCell>
            <TableCell>{"default" in prop ? <Code>{String(prop.default)}</Code> : "—"}</TableCell>
            <TableCell>{prop.description}</TableCell>
          </TableRow>}</For></TableBody>
        </Table>
        <Text tone="muted" size="caption">Native Solid/HTML attributes remain available and are omitted from this authored-prop view.</Text>
      </section>
    </Stack>
  </main>;
}

export default function ComponentRoute() {
  const params = useParams<{ name: string }>();
  const selected = createMemo(() => {
    const doc = componentDocs.find(candidate => candidate.name === params.name);
    const examples = componentExamples[params.name];
    return doc && examples ? { doc, examples } : undefined;
  });
  return <Show when={selected()} fallback={<main><Heading level={1}>Unknown component</Heading><Link href="/components">Return to component index</Link></main>}>
    {value => <ComponentPage doc={value().doc} examples={value().examples} />}
  </Show>;
}
