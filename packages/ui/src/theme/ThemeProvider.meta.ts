import { defineMeta } from "../metadata.ts";
import type { ThemeProviderProps } from "./ThemeProvider.tsx";

export default defineMeta<ThemeProviderProps>({
  name: "ThemeProvider", package: "@gemologic/sheen", category: "theming", summary: "Owns application theme state, scoped overlays, messages, and root-only persistence.",
  props: {
    initialState: { description: "Deterministic initial state; cookie mode requires identical server/client state." },
    defaultMode: { description: "Fresh-install preference; system follows the OS only when explicitly selected.", default: "dark", control: { kind: "select", values: ["dark", "light", "system"] } },
    defaultTheme: { description: "Default registered theme ID.", default: "obsidian" },
    defaultAccent: { description: "Default independent accent preset.", default: "jade" },
    defaultDensity: { description: "Default control density.", default: "comfortable", control: { kind: "select", values: ["compact", "comfortable", "spacious"] } },
    defaultRadius: { description: "Default corner treatment.", default: "soft", control: { kind: "select", values: ["sharp", "soft", "round"] } },
    defaultMotion: { description: "Default motion preference; OS reduced motion still wins.", default: "full", control: { kind: "select", values: ["full", "reduced"] } },
    direction: { description: "Explicit writing direction.", default: "ltr", control: { kind: "select", values: ["ltr", "rtl"] } },
    locale: { description: "Explicit server/client Intl locale.", default: "en-US", control: { kind: "text" } },
    themes: { description: "Registered themes. Load their CSS and configure the same prepaint catalog." },
    storageKey: { description: "Root preference storage key.", default: "sheen" },
    hydration: { description: "Client prepaint handoff or cookie-authoritative SSR.", default: "client", control: { kind: "select", values: ["client", "cookie"] } },
    persist: { description: "Cookie-mode app callback, awaited before accepting preference changes." },
    onPersistenceError: { description: "Reports failed storage or cookie persistence." },
    nonce: { description: "CSP nonce for generated scope scripts; match the document policy." },
    messages: { description: "Partial translations inheriting English defaults." },
  },
  tokens: [], a11y: { role: "context provider", keyboard: [] },
  examples: [{ title: "Dark application root", code: '<ThemeProvider defaultMode="dark" locale="en-US"><Button>Save</Button></ThemeProvider>' }],
  guidance: { do: ["Install the theme prepaint script in client hydration mode."], dont: ["Do not choose initial markup from browser-only state."] },
});
