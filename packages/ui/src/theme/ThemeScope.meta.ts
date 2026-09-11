import { defineMeta } from "../metadata.ts";
import type { ThemeScopeProps } from "./ThemeProvider.tsx";

export default defineMeta<ThemeScopeProps>({
  name: "ThemeScope", package: "@gemologic/sheen", category: "theming", summary: "Overrides theme axes locally, with inherited messages and a contextual overlay target.",
  props: {
    theme: { description: "Local theme ID; omitted inherits and null resets to provider default." },
    mode: { description: "Local mode; omitted inherits and null resets.", control: { kind: "select", values: ["dark", "light", "system", null] } },
    accent: { description: "Local accent preset; never changes root persistence." },
    density: { description: "Local density; omitted inherits and null resets.", control: { kind: "select", values: ["compact", "comfortable", "spacious", null] } },
    radius: { description: "Local corner treatment; omitted inherits and null resets.", control: { kind: "select", values: ["sharp", "soft", "round", null] } },
    motion: { description: "Local motion preference; OS reduced motion still wins.", control: { kind: "select", values: ["full", "reduced", null] } },
    direction: { description: "Local writing direction; omitted inherits and null resets.", control: { kind: "select", values: ["ltr", "rtl", null] } },
    locale: { description: "Local explicit formatting locale; omitted inherits and null resets." },
    controllable: { description: "Allows scoped setters to modify local overrides only.", default: false, control: { kind: "boolean" } },
    class: { description: "Class for the scope wrapper." },
    messages: { description: "Partial translations layered over the parent scope's messages." },
  },
  tokens: [], a11y: { role: "themed region", keyboard: [] },
  examples: [{ title: "Light comparison pane", code: '<ThemeScope theme="paper" mode="light" accent="indigo"><Input label="Preview name" /></ThemeScope>' }],
  guidance: { do: ["Use independent iframes for full-layout comparisons."], dont: ["Do not expect scopes to persist preferences."] },
});
