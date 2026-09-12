import { readFile } from "node:fs/promises";
import type { PlannedFile } from "./files.js";

export interface AppScaffoldAssets {
  readonly skill: string;
  readonly context: string;
  readonly version: string;
}

function title(value: string): string {
  return value.split("-").map(word => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(" ");
}

function camel(value: string): string {
  const words = value.split("-");
  return words.map((word, index) => index === 0 ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join("");
}

function kebab(value: string): string {
  return value
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, "$1-$2")
    .replaceAll(/([a-z\d])([A-Z])/gu, "$1-$2")
    .toLowerCase();
}

async function loadAppAsset(bundled: string, workspace: string): Promise<string> {
  try {
    return await readFile(new URL(bundled, import.meta.url), "utf8");
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
    return readFile(new URL(workspace, import.meta.url), "utf8");
  }
}

async function bundledAppAssets(): Promise<AppScaffoldAssets> {
  const [skill, context, manifestSource] = await Promise.all([
    loadAppAsset("./skill/SKILL.md", "../../../dist/skill/SKILL.md"),
    loadAppAsset("./skill/llms.txt", "../../../dist/skill/llms.txt"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const manifest: unknown = JSON.parse(manifestSource);
  if (typeof manifest !== "object" || manifest === null || !("version" in manifest) || typeof manifest.version !== "string") {
    throw new Error("The Sheen CLI package must declare its version");
  }
  return { skill, context, version: manifest.version };
}

export async function appScaffold(name: string): Promise<readonly PlannedFile[]> {
  return createAppScaffold(name, await bundledAppAssets());
}

export function createAppScaffold(name: string, assets: AppScaffoldAssets): readonly PlannedFile[] {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) throw new Error("App name must be lower kebab-case");
  const label = title(name);
  const prefix = `${name}/`;
  const file = (path: string, content: string): PlannedFile => ({ path: `${prefix}${path}`, content });
  return [
    file("package.json", `${JSON.stringify({
      name,
      private: true,
      type: "module",
      packageManager: "pnpm@11.25.0",
      engines: { node: ">=24 <25" },
      scripts: { dev: "vite dev", build: "vite build", preview: "vite preview", typecheck: "tsc --noEmit", lint: "eslint .", check: "pnpm lint && pnpm typecheck && pnpm build" },
      dependencies: {
        "@gemologic/sheen": `^${assets.version}`,
        "@gemologic/sheen-icons": `^${assets.version}`,
        "@gemologic/sheen-patterns": `^${assets.version}`,
        "@gemologic/sheen-tokens": `^${assets.version}`,
        "@solidjs/meta": "0.29.4",
        "@solidjs/router": "1.0.0",
        "@solidjs/start": "2.0.4",
        "solid-js": "1.9.15",
      },
      devDependencies: {
        "@eslint-community/eslint-plugin-eslint-comments": "^4.7.2",
        "@tailwindcss/vite": "4.3.3",
        "@types/node": "24.13.3",
        eslint: "10.10.0",
        "eslint-plugin-sheen": `^${assets.version}`,
        tailwindcss: "4.3.3",
        typescript: "6.0.3",
        "typescript-eslint": "8.69.0",
        vite: "8.2.2",
      },
    }, null, 2)}\n`),
    file("pnpm-workspace.yaml", `packages:\n  - "."\n`),
    file("tsconfig.json", `${JSON.stringify({
      compilerOptions: {
        target: "ES2023", lib: ["ES2023", "DOM", "DOM.Iterable"], module: "ESNext", moduleResolution: "Bundler", strict: true,
        noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true, verbatimModuleSyntax: true, isolatedModules: true, skipLibCheck: true,
        jsx: "preserve", jsxImportSource: "solid-js", types: ["@solidjs/start/env", "node"], noEmit: true,
      },
      include: ["src/**/*.ts", "src/**/*.tsx", "vite.config.ts"],
      exclude: ["node_modules", "dist", ".output"],
    }, null, 2)}\n`),
    file("vite.config.ts", `import tailwind from "@tailwindcss/vite";
import { sheenRuntime } from "@gemologic/sheen/vite";
import { sheenIcons } from "@gemologic/sheen-icons/vite";
import { solidStart } from "@solidjs/start/config";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sheenRuntime(), sheenIcons({ sets: ["radix", "phosphor"] }), solidStart({ devOverlay: false }), tailwind()],
});
`),
    file("eslint.config.js", `import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import sheen from "eslint-plugin-sheen";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", ".output/**", "node_modules/**"] },
  tseslint.configs.recommended,
  sheen.configs.recommended,
  {
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
);
`),
    file(".gitignore", `node_modules/\ndist/\n.output/\n.solid/\n.env\n`),
    file("src/entry-client.tsx", `import { mount, StartClient } from "@solidjs/start/client";

const root = document.getElementById("app");
if (!root) throw new Error("Missing SSR application root");
mount(() => <StartClient />, root);
`),
    file("src/entry-server.tsx", `import { createKeyboardHydrationScript } from "@gemologic/sheen";
import { createThemeScript } from "@gemologic/sheen/theme-script";
import plexMonoRegular from "@gemologic/sheen-tokens/fonts/IBMPlexMono-Regular.woff2?url";
import plexSansRegular from "@gemologic/sheen-tokens/fonts/IBMPlexSans-Regular.woff2?url";
import plexSansSemibold from "@gemologic/sheen-tokens/fonts/IBMPlexSans-SemiBold.woff2?url";
import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => <StartServer document={props => <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preload" href={plexSansRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexSansSemibold} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexMonoRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <script innerHTML={createThemeScript()} />
    {props.assets}
    <script innerHTML={createKeyboardHydrationScript()} />
  </head>
  <body><div id="app">{props.children}</div>{props.scripts}</body>
</html>} />);
`),
    file("src/app.tsx", `import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import type { ParentProps } from "solid-js";
import { Heading, ShortcutProvider, ThemeProvider, Toaster, createToaster } from "@gemologic/sheen";
import { AppShell, SidebarNav } from "@gemologic/sheen-patterns";
import type { SidebarNavSection } from "@gemologic/sheen-patterns";
import { useSolidRouterAdapter } from "@gemologic/sheen-patterns/solid-router";
import "./app.css";

const navigation: readonly SidebarNavSection[] = [{ id: "main", label: "Application", items: [{ kind: "link", id: "home", label: "Home", href: "/", match: "exact" }] }];

function ApplicationRoot(props: ParentProps) {
  const router = useSolidRouterAdapter();
  const notices = createToaster();
  return <MetaProvider><ThemeProvider hydration="client" defaultMode="dark">
    <ShortcutProvider development={import.meta.env.DEV}>
      <AppShell label="Application content" documentTitle=${JSON.stringify(label)} router={router} shortcutHelp
        header={<Heading level={1} size="h3">${label}</Heading>}
        sidebar={<SidebarNav sections={navigation} pathname={router.location().pathname} />}>
        <Suspense>{props.children}</Suspense>
      </AppShell>
      <Toaster controller={notices} />
    </ShortcutProvider>
  </ThemeProvider></MetaProvider>;
}

export default function App() {
  return <Router root={props => <ApplicationRoot>{props.children}</ApplicationRoot>}><FileRoutes /></Router>;
}
`),
    file("src/routes/index.tsx", `import { For } from "solid-js";
import { Button, Card, Grid, Heading, Row, Select, Text, useTheme } from "@gemologic/sheen";
import type { SelectOption } from "@gemologic/sheen";
import { accentNames, isAccentName } from "@gemologic/sheen-tokens";

const modeOptions: readonly SelectOption[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

export default function Home() {
  const theme = useTheme();
  return <Grid gap="lg" class="app-home">
    <div><Heading level={2} size="h1">${label}</Heading><Text tone="muted">Dark by default, with independent theme and accent choices.</Text></div>
    <Row gap="md" wrap>
      <Select label="Theme" value={theme.theme()} options={theme.themes().map(item => ({ value: item.id, label: item.label }))}
        onValueChange={value => { if (value) void theme.setTheme(value); }} />
      <Select label="Accent" value={theme.accent()} options={accentNames.map(value => ({ value, label: value }))}
        onValueChange={value => { if (value && isAccentName(value)) void theme.setAccent(value); }} />
      <Select label="Mode" value={theme.mode()} options={modeOptions}
        onValueChange={value => { if (value === "dark" || value === "light" || value === "system") void theme.setMode(value); }} />
    </Row>
    <Grid columns={3} gap="md"><For each={["Retained refresh", "Scoped overlays", "Accessible defaults"]}>{item => <Card><Heading level={3} size="h3">{item}</Heading><Text tone="muted">Replace this card with an application-owned feature.</Text><Button variant="outline">Example action</Button></Card>}</For></Grid>
  </Grid>;
}
`),
    file("src/app.css", `@import "tailwindcss";
@import "@gemologic/sheen-tokens/fonts.css";
@import "@gemologic/sheen-tokens/themes.css";
@import "@gemologic/sheen-tokens/core.css";
@import "@gemologic/sheen-tokens/preset.css";
@import "@gemologic/sheen/styles.css";
@import "@gemologic/sheen-icons/styles.css";
@import "@gemologic/sheen-patterns/styles.css";

* { box-sizing: border-box; }
html, body, #app { margin: 0; block-size: 100%; overflow: hidden; }
.app-home { align-content: start; padding: var(--sheen-space-section); }
.app-home > .sheen-row { align-items: end; }
.app-home > .sheen-row > * { min-inline-size: 12rem; }

@media (width < 768px) {
  html, body, #app { block-size: auto; min-block-size: 100%; overflow: auto; }
  .app-home > .sheen-grid { grid-template-columns: minmax(0, 1fr); }
}
`),
    file("README.md", `# ${label}

Generated by \`sheen new app\` with SolidStart 2, a fixed Sheen shell, scoped overlays, preloaded local fonts, and dark-default client hydration.

Run \`pnpm install\`, then \`pnpm check\`. The blocking theme script owns the root theme attributes before paint; \`ThemeProvider\` adopts them after mount. Keep accepted component content mounted during background refreshes. Use cold skeletons only when a region has no accepted data.

All seven bundled themes and twelve accent presets are imported. Remove unused theme/accent CSS entries when bundle size matters. Keep \`sheenRuntime()\` in the Vite configuration: Sheen ships its overlay backend and patched DOM renderer, sharing your app's \`solid-js@1.9.15\` core. No consumer dependency patches or Kobalte dependency are required.
`),
    file("AGENTS.md", `# ${label} agent instructions

- Read \`.agents/skills/sheen/llms.txt\` before choosing Sheen components or props.
- Import only public \`@gemologic/sheen*\` entries. Do not import Kobalte, Corvu, TanStack, uPlot, or D3 directly.
- Keep \`sheenRuntime()\` in Vite and \`solid-js@1.9.15\` in application dependencies. Sheen shares that core and owns its DOM renderer and overlay backend.
- Keep Solid props reactive. Use direct reads or \`splitProps\`, never object-destructure component props.
- With \`exactOptionalPropertyTypes\`, omit absent optional JSX props instead of passing \`undefined\`.
- Use semantic Sheen tokens, logical properties, and \`Stack\`/\`Row\`/\`Grid\` layout primitives.
- Use \`Link\` for navigation and \`Button\` for actions. Meaningful icons need labels; icon-only actions use \`IconButton\`.
- Emit complete deterministic server markup. The blocking theme script owns client-mode root attributes; the provider adopts them after mount.
- Keep accepted content and stable DOM owners mounted during refresh. Preserve focus, drafts, selection, expansion, and scroll.
- Use numbered server pagination for large or expensive remote data. Continuous mode is only for complete bounded results.
- Treat Git commands as read-only context. Never revert concurrent work.
- Run \`pnpm check\` before handoff and state exactly what remains unverified.
`),
    file("default.nix", `{ pkgs ? import
    (fetchTarball {
      # nixup: pin=jpetrucciani/nix;
      name = "jpetrucciani-2026-09-06";
      url = "https://github.com/jpetrucciani/nix/archive/6953a249aef5c98944830e9e89c3e530b955ba9f.tar.gz";
      sha256 = "1q9q113i5dcr3ga9cnl9gkqraa7xwwcw8d217bm53vlhn0282wgr";
    })
    { }
}:
let
  name = ${JSON.stringify(name)};
  node = pkgs.nodejs_24;
  scripts = with pkgs; {
    app-install = pog {
      name = "app-install";
      description = "Install locked application dependencies";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm install "$@"'';
    };
    app-check = pog {
      name = "app-check";
      description = "Lint, typecheck, and build the application";
      runtimeInputs = [ node pnpm ];
      script = ''pnpm check "$@"'';
    };
  };
  tools = with pkgs; {
    cli = [ jfmt nixup ];
    node = [ node pnpm typescript-language-server ];
    scripts = pkgs.lib.attrsets.attrValues scripts;
  };
  paths = pkgs.lib.flatten [ (builtins.attrValues tools) ];
  env = pkgs.buildEnv { inherit name paths; buildInputs = paths; };
in
(env.overrideAttrs (old: { inherit name; env = old.env or { }; })) // { inherit scripts; }
`),
    file(".agents/skills/sheen/SKILL.md", assets.skill),
    file(".agents/skills/sheen/llms.txt", assets.context),
  ];
}

export function themeScaffold(name: string): readonly PlannedFile[] {
  if (!/^[a-z][a-z0-9-]*$/u.test(name)) throw new Error("Theme name must be lower kebab-case");
  const identifier = `${camel(name)}Theme`;
  const label = title(name);
  return [{
    path: `src/themes/${name}.ts`,
    content: `import { currentSchemaVersion, defineTheme, obsidian } from "@gemologic/sheen-tokens";
import type { ThemeDefinition } from "@gemologic/sheen-tokens";

const definition = {
  ...obsidian,
  schemaVersion: currentSchemaVersion,
  id: ${JSON.stringify(name)},
  label: ${JSON.stringify(label)},
  description: ${JSON.stringify(`${label} theme derived from Obsidian`)},
  defaultMode: "dark",
  dark: { ...obsidian.dark },
  light: { ...obsidian.light },
} satisfies ThemeDefinition;

export const ${identifier} = defineTheme(definition);
export default ${identifier};
`,
  }];
}

export function componentScaffold(name: string): readonly PlannedFile[] {
  if (!/^[A-Z][A-Za-z0-9]*$/u.test(name)) throw new Error("Component name must be PascalCase");
  const stem = `packages/ui/src/primitives/${name}`;
  const className = `sheen-${kebab(name)}`;
  return [
    {
      path: `${stem}.tsx`,
      content: `import { splitProps } from "solid-js";
import type { JSX } from "solid-js";
import { cn } from "../utils/cn.ts";

export interface ${name}Props extends JSX.HTMLAttributes<HTMLDivElement> {}

export function ${name}(props: ${name}Props): JSX.Element {
  const [local, others] = splitProps(props, ["class", "children"]);
  return <div {...others} class={cn(${JSON.stringify(className)}, local.class)}>{local.children}</div>;
}
`,
    },
    {
      path: `${stem}.meta.ts`,
      content: `import { defineMeta } from "../metadata.ts";
import type { ${name}Props } from "./${name}.tsx";

export default defineMeta<${name}Props>({
  name: ${JSON.stringify(name)},
  package: "@gemologic/sheen",
  category: "primitives",
  summary: ${JSON.stringify(`${name} application content.`)},
  props: {},
  tokens: [],
  a11y: { role: "group", keyboard: [] },
  examples: [{ title: "Default", code: ${JSON.stringify(`<${name}>Content</${name}>`)} }],
  guidance: { do: ["Use semantic children."], dont: ["Do not duplicate an existing Sheen primitive."] },
});
`,
    },
    {
      path: `${stem}.demo.tsx`,
      content: `import { ${name} } from "./${name}.tsx";
import type { ${name}Props } from "./${name}.tsx";
import metadata from "./${name}.meta.ts";

export const controls = metadata.props;
export default function ${name}Demo(props: ${name}Props) {
  return <${name} {...props}>{props.children ?? "Content"}</${name}>;
}
`,
    },
    {
      path: `${stem}.test.tsx`,
      content: `import { describe, expect, it } from "vitest";
import { renderToString } from "solid-js/web";
import { ${name} } from "./${name}.tsx";

describe("${name} server contract", () => {
  it("renders complete content without browser globals", () => {
    const html = renderToString(() => <${name}>Content</${name}>);
    expect(html).toContain("Content");
  });
});
`,
    },
  ];
}
