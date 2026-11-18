import { For, Show, createMemo, createSignal } from "solid-js";
import { Heading, Link, SearchInput, Text } from "@gemologic/sheen";
import { componentIndex } from "../../generated/component-index.ts";
import { componentExamples } from "../../generated/component-examples/index.ts";
import "../../package-styles.css";

function categoryId(category: string): string {
  return `component-category-${category.toLocaleLowerCase("en-US").replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "")}`;
}

function categoryKey(category: string): string {
  return category.replaceAll("-", " ");
}

function categoryLabel(category: string): string {
  return category.replace(/^./u, character => character.toLocaleUpperCase("en-US"));
}

// Each semantic icon also ships as a static component; the Icon card covers them so the inventory lists distinct components.
const inventory = componentIndex.filter(component => component.package !== "@gemologic/sheen-icons" || component.name === "Icon" || component.name === "DynamicIcon");

export default function ComponentIndex() {
  const [query, setQuery] = createSignal("");
  const visibleComponents = createMemo(() => {
    const normalized = query().trim().toLocaleLowerCase("en-US");
    if (!normalized) return inventory;
    return inventory.filter(component => `${component.name} ${component.summary} ${component.category} ${component.package}`.toLocaleLowerCase("en-US").includes(normalized));
  });
  const visibleNames = createMemo(() => new Set(visibleComponents().map(component => component.name)));
  const categories = createMemo(() => [...new Set(visibleComponents().map(component => categoryKey(component.category)))].sort());
  // Cards stay mounted while filtering so previews keep their DOM and never re-render or reload.
  const allCategories = [...new Set(inventory.map(component => categoryKey(component.category)))].sort();

  return <main class="loupe-docs-index">
    <header class="loupe-component-index-heading">
      <div>
        <span class="loupe-eyebrow">Validated public inventory</span>
        <Heading level={1}>Component laboratory</Heading>
        <Text tone="muted" size="body">Scan every component in place, then open its playground for controls, variants, anatomy, and accessibility guidance.</Text>
      </div>
      <div class="loupe-component-search">
        <SearchInput name="componentSearch" label="Find a component" value={query()} onValueChange={setQuery} placeholder="Name, purpose, or package" />
        <Text tone="muted" size="caption">Showing {visibleComponents().length} of {inventory.length}</Text>
      </div>
    </header>

    <nav class="loupe-component-categories" aria-label="Component categories">
      <For each={categories()}>{category => <a href={`#${categoryId(category)}`}><span>{categoryLabel(category)}</span><small>{visibleComponents().filter(component => categoryKey(component.category) === category).length}</small></a>}</For>
    </nav>

    <Show when={visibleComponents().length === 0}>
      <section class="loupe-component-empty"><Heading level={2} size="h3">No matching components</Heading><Text tone="muted">Try a component name, package, or broader purpose.</Text></section>
    </Show>
    <div class="loupe-component-sections" hidden={visibleComponents().length === 0}>
      <For each={allCategories}>{category => {
        const components = inventory.filter(component => categoryKey(component.category) === category);
        const visibleCount = () => components.filter(component => visibleNames().has(component.name)).length;
        return <section class="loupe-component-section" aria-labelledby={categoryId(category)} hidden={visibleCount() === 0}>
          <header><Heading id={categoryId(category)} level={2} size="h3">{categoryLabel(category)}</Heading><Text tone="muted" size="caption">{visibleCount()} components</Text></header>
          <div class="loupe-component-grid">
            <For each={components}>{component => {
              const Preview = componentExamples[component.name];
              return <article class="loupe-component-card" data-component={component.name} data-category={component.category} hidden={!visibleNames().has(component.name)}>
                <header><Link href={`/components/${component.name}`}>{component.name}</Link><code>{component.package.replace("@gemologic/", "")}</code></header>
                <div class="loupe-component-card-preview" data-component-preview={component.name} aria-hidden="true" inert>
                  {Preview ? <Preview kind="example" index={0} /> : null}
                </div>
                <Text tone="muted" size="ui-sm">{component.summary}</Text>
                <Link href={`/components/${component.name}`} class="loupe-component-open">Open playground <span aria-hidden="true">→</span></Link>
              </article>;
            }}</For>
          </div>
        </section>;
      }}</For>
    </div>
  </main>;
}
