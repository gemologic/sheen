import { Button, Stack, Surface, TagInput, ThemeScope } from "@gemologic/sheen";
import type { TagInputValidationContext, TagInputValidationResult } from "@gemologic/sheen";
import { createSignal } from "solid-js";

const longLabel = "incident-response-owner-with-an-intentionally-long-unbroken-identifier-for-overflow-qualification";

function parseValidation(payload: unknown): TagInputValidationResult {
  if (typeof payload !== "object" || payload === null || !("kind" in payload)) throw new Error("Invalid tag validation response");
  if (payload.kind === "accepted" && "value" in payload && typeof payload.value === "string") return { kind: "accepted", value: payload.value };
  if (payload.kind === "rejected" && "message" in payload && typeof payload.message === "string") return { kind: "rejected", message: payload.message };
  throw new Error("Invalid tag validation response");
}

export default function TagInputFixture() {
  const [labels, setLabels] = createSignal<readonly string[]>(["frontend", "urgent", longLabel]);
  const [submitted, setSubmitted] = createSignal("");
  const validate = async (candidate: string, _context: TagInputValidationContext, signal: AbortSignal): Promise<TagInputValidationResult> => {
    const delay = candidate === "slow" ? 700 : 250;
    const response = await fetch(`/api/tag-validation?value=${encodeURIComponent(candidate)}&delay=${delay}`, { signal });
    if (!response.ok) throw new Error(`Tag validation failed (${response.status})`);
    return parseValidation(await response.json());
  };
  return <main class="loupe-tag-input-page"><h1>TagInput</h1><Stack>
    <form onSubmit={event => { event.preventDefault(); setSubmitted(JSON.stringify([...new FormData(event.currentTarget).entries()])); }}>
      <Surface padding="lg"><Stack>
        <div class="loupe-tag-input-bounds"><TagInput label="Project labels" name="labels" value={labels()} onValueChange={setLabels} validate={validate} placeholder="Add a label" description="Enter or comma adds. Alt plus arrows reorders." required /></div>
        <div class="actions"><Button type="submit">Inspect tags</Button><Button type="reset">Reset form</Button></div>
        <output aria-label="Tag form values">{submitted()}</output>
      </Stack></Surface>
    </form>
    <ThemeScope theme="paper" mode="light" accent="violet" direction="rtl" class="loupe-tag-input-scope">
      <TagInput label="Read-only RTL labels" defaultValue={["alpha", "beta"]} readOnly />
    </ThemeScope>
  </Stack></main>;
}
