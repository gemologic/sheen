import { For, Show, createMemo, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Heading, Link, SearchInput, Text } from "@gemologic/sheen";
import { componentDocs } from "../../generated/component-docs.ts";
import { componentExamples } from "../../generated/component-examples/index.ts";

function categoryId(category: string): string {
  return `component-category-${category.toLocaleLowerCase("en-US").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "")}`;
}

function categoryKey(category: string): string {
  return category.replaceAll("-", " ");
}

function categoryLabel(category: string): string {
  return category.replace(/^./u, character => character.toLocaleUpperCase("en-US"));
}

export default function ComponentIndex() {
  const [query, setQuery] = createSignal("");
  const visibleComponents = createMemo(() => {
    const normalized = query().trim().toLocaleLowerCase("en-US");
    if (!normalized) return componentDocs;
    return componentDocs.filter(component => `${component.name} ${component.summary} ${component.category} ${component.package}`.toLocaleLowerCase("en-US").includes(normalized));
  });
  const categories = createMemo(() => [...new Set(visibleComponents().map(component => categoryKey(component.category)))].sort());

  return <main class="loupe-docs-index">
    <header class="loupe-component-index-heading">
      <div>
        <span class="loupe-eyebrow">Validated public inventory</span>
        <Heading level={1}>Component laboratory</Heading>
        <Text tone="muted" size="body">Scan every component in place, then open its playground for controls, variants, anatomy, and accessibility guidance.</Text>
      </div>
      <div class="loupe-component-search">
        <SearchInput name="componentSearch" label="Find a component" value={query()} onValueChange={setQuery} placeholder="Name, purpose, or package" />
        <Text tone="muted" size="caption">Showing {visibleComponents().length} of {componentDocs.length}</Text>
      </div>
    </header>

    <nav class="loupe-component-categories" aria-label="Component categories">
      <For each={categories()}>{category => <a href={`#${categoryId(category)}`}><span>{categoryLabel(category)}</span><small>{visibleComponents().filter(component => categoryKey(component.category) === category).length}</small></a>}</For>
    </nav>

    <Show when={visibleComponents().length > 0} fallback={<section class="loupe-component-empty"><Heading level={2} size="h3">No matching components</Heading><Text tone="muted">Try a component name, package, or broader purpose.</Text></section>}>
      <div class="loupe-component-sections">
        <For each={categories()}>{category => {
          const components = () => visibleComponents().filter(component => categoryKey(component.category) === category);
          return <section class="loupe-component-section" aria-labelledby={categoryId(category)}>
            <header><Heading id={categoryId(category)} level={2} size="h3">{categoryLabel(category)}</Heading><Text tone="muted" size="caption">{components().length} components</Text></header>
            <div class="loupe-component-grid">
              <For each={components()}>{component => {
                const example = componentExamples[component.name]?.examples[0];
                return <article class="loupe-component-card" data-component={component.name} data-category={component.category}>
                  <header><Link href={`/components/${component.name}`}>{component.name}</Link><code>{component.package.replace("@gemologic/", "")}</code></header>
                  <div class="loupe-component-card-preview" data-component-preview={component.name} aria-hidden="true" inert>
                    <Show when={example}>{preview => <Dynamic component={preview().render} />}</Show>
                  </div>
                  <Text tone="muted" size="ui-sm">{component.summary}</Text>
                  <Link href={`/components/${component.name}`} class="loupe-component-open">Open playground <span aria-hidden="true">→</span></Link>
                </article>;
              }}</For>
            </div>
          </section>;
        }}</For>
      </div>
    </Show>
  </main>;
}
