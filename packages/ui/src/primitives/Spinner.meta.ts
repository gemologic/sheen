import { defineMeta } from "../metadata.ts";
import type { SpinnerProps } from "./Spinner.tsx";

export default defineMeta<SpinnerProps>({
  name: "Spinner", package: "@gemologic/sheen", category: "loading",
  summary: "A compact loading status with localized text and an optional decorative presentation.",
  props: {
    size: { description: "Semantic icon size.", default: "md", control: { kind: "select", values: ["sm", "md", "lg"] } },
    label: { description: "Localized status text, defaulting to the provider's loading message.", control: { kind: "text" } },
    decorative: { description: "Hide the spinner when surrounding content already announces loading.", default: false, control: { kind: "boolean" } },
  },
  tokens: ["--sheen-color-fg-muted", "--sheen-icon-size-sm", "--sheen-icon-size-md", "--sheen-icon-size-lg", "--sheen-duration-slow"],
  a11y: { role: "status unless decorative", keyboard: [] },
  examples: [{ title: "Saving status", code: '<Spinner label="Saving changes" />' }],
  guidance: { do: ["Use a compact status inside the affected region. The app owns loading timing.", "Use decorative mode beside an existing loading announcement to avoid duplicates."], dont: ["Do not use full-page spinners or replace existing content during refresh.", "Do not rely on an initially server-rendered live region being announced automatically."] },
});
