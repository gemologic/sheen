import { createSignal } from "solid-js";
import { Button, Combobox, MultiCombobox, Stack, ThemeScope } from "@gemologic/sheen";
import type { ComboboxOption } from "@gemologic/sheen";

const initialOptions: readonly ComboboxOption[] = [
  { value: "ada", label: "Ada Lovelace", description: "Analytical engine" },
  { value: "grace", label: "Grace Hopper", description: "Compilers" },
  { value: "linus", label: "Linus Torvalds", description: "Kernel development" },
  { value: "margaret", label: "Margaret Hamilton", description: "Flight software" },
  { value: "radia", label: "Radia Perlman", description: "Network protocols" },
];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOptions(value: unknown): ComboboxOption[] {
  if (!Array.isArray(value)) throw new Error("Invalid combobox response");
  return value.map(item => {
    if (!record(item) || typeof item.value !== "string" || typeof item.label !== "string" || typeof item.description !== "string") throw new Error("Invalid combobox response");
    return { value: item.value, label: item.label, description: item.description };
  });
}

export default function ComboboxFixture() {
  const [options, setOptions] = createSignal<readonly ComboboxOption[]>(initialOptions);
  const [pending, setPending] = createSignal(false);
  const [resultsError, setResultsError] = createSignal<string>();
  const [query, setQuery] = createSignal("");
  const [attempt, setAttempt] = createSignal(0);
  const [selected, setSelected] = createSignal<string | null>(null);
  const [multiple, setMultiple] = createSignal<readonly string[]>(["ada"]);
  const [formValue, setFormValue] = createSignal("");
  let requestToken = 0;
  let controller: AbortController | undefined;

  async function request(nextQuery: string, retry = false): Promise<void> {
    setQuery(nextQuery);
    const nextAttempt = retry ? attempt() + 1 : 1;
    setAttempt(nextAttempt);
    const token = ++requestToken;
    controller?.abort();
    controller = new AbortController();
    setPending(true);
    setResultsError(undefined);
    try {
      const response = await fetch(`/api/combobox?query=${encodeURIComponent(nextQuery)}&attempt=${nextAttempt}&delay=450`, { signal: controller.signal });
      if (!response.ok) throw new Error(await response.text());
      const next = parseOptions(await response.json());
      if (token !== requestToken) return;
      setOptions(next);
      setPending(false);
    } catch (error) {
      if (token !== requestToken || error instanceof DOMException && error.name === "AbortError") return;
      setResultsError(error instanceof Error ? error.message : "Search failed");
      setPending(false);
    }
  }

  return <main class="loupe-combobox-page"><h1>Combobox qualification</h1><Stack>
    <form id="combobox-form" onSubmit={event => {
      event.preventDefault();
      setFormValue(JSON.stringify([...new FormData(event.currentTarget).entries()]));
    }}><Stack>
      <Combobox label="Async owner" name="owner" options={options()} value={selected()} onValueChange={setSelected} filter={false}
        placeholder="Search people" description="App-owned requests retain accepted results." pending={pending()} resultsError={resultsError() ?? ""}
        onRetry={() => void request(query(), true)} onInputChange={value => void request(value)} />
      <MultiCombobox label="Reviewers" name="reviewers" options={initialOptions} value={multiple()} onValueChange={setMultiple} placeholder="Add reviewers" />
      <Button type="submit">Inspect form</Button>
    </Stack></form>
    <output aria-label="Selected owner">{selected() ?? "none"}</output>
    <output aria-label="Selected reviewers">{multiple().join(",")}</output>
    <output aria-label="Form values">{formValue()}</output>
    <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-combobox-scope">
      <Combobox label="Scoped owner" options={initialOptions} defaultValue="grace" />
    </ThemeScope>
  </Stack></main>;
}
