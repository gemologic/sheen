import { createContext, createEffect, createMemo, createSignal, createUniqueId, onCleanup, onMount, useContext } from "solid-js";
import type { Accessor, JSX, ParentProps } from "solid-js";
import { I18nProvider } from "@kobalte/core/i18n";
import { bundledThemeMetadata, iconSetForTheme } from "@gemologic/sheen-tokens/catalog";
import type { ThemeMetadata } from "@gemologic/sheen-tokens/catalog";
import type { Mode } from "@gemologic/sheen-tokens";
import { defaultThemeState, readThemeState, resolveThemeState } from "./state.ts";
import type { ThemeOverrides, ThemeState } from "./state.ts";
import { createScopeScript } from "./script.ts";
import { createOverlayStack } from "./layers.ts";
import type { OverlayStack } from "./layers.ts";
import { englishMessages, resolveMessages } from "./messages.ts";
import type { Messages } from "./messages.ts";

interface ThemeRuntime {
  state: Accessor<ThemeState>;
  defaults: ThemeState;
  resolvedMode: Accessor<Mode>;
  ready: Accessor<boolean>;
  portal: Accessor<HTMLElement | undefined>;
  tokenTarget: Accessor<HTMLElement | undefined>;
  themes: readonly ThemeMetadata[];
  nonce: string | undefined;
  layers: OverlayStack;
  messages: Accessor<Messages>;
  set: (next: Partial<ThemeState>) => Promise<void>;
}

export interface ThemeContextValue extends Omit<ThemeRuntime, "themes"> {
  theme: Accessor<string>;
  mode: Accessor<ThemeState["mode"]>;
  accent: Accessor<ThemeState["accent"]>;
  density: Accessor<ThemeState["density"]>;
  radius: Accessor<ThemeState["radius"]>;
  themes: Accessor<readonly ThemeMetadata[]>;
  setTheme: (value: string) => Promise<void>;
  setMode: (value: ThemeState["mode"]) => Promise<void>;
  setAccent: (value: ThemeState["accent"]) => Promise<void>;
  setDensity: (value: ThemeState["density"]) => Promise<void>;
  setRadius: (value: ThemeState["radius"]) => Promise<void>;
}

function exposeTheme(runtime: ThemeRuntime): ThemeContextValue {
  return {
    ...runtime,
    portal: () => runtime.ready() ? runtime.portal() : undefined,
    tokenTarget: () => runtime.ready() ? runtime.tokenTarget() : undefined,
    theme: () => runtime.state().theme,
    mode: () => runtime.state().mode,
    accent: () => runtime.state().accent,
    density: () => runtime.state().density,
    radius: () => runtime.state().radius,
    themes: () => runtime.themes,
    setTheme: theme => runtime.set({ theme }),
    setMode: mode => runtime.set({ mode }),
    setAccent: accent => runtime.set({ accent }),
    setDensity: density => runtime.set({ density }),
    setRadius: radius => runtime.set({ radius }),
  };
}

const ThemeContext = createContext<ThemeContextValue>();

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("sheen components require a ThemeProvider");
  return context;
}

function attributes(state: ThemeState, mode: Mode, themes: readonly ThemeMetadata[]): Record<string, string> {
  return Object.fromEntries(Object.entries({ ...state, mode, "icon-set": iconSetForTheme(state.theme, themes) }).map(([name, value]) => [`data-sheen-${name}`, value]));
}

function PortalTarget(props: { kind: "root" | "scope"; state: ThemeState | undefined; mode: Mode; themes: readonly ThemeMetadata[]; ready?: boolean; ref: (element: HTMLDivElement) => void }): JSX.Element {
  // Attribute spreads also reconcile children. Portal children belong to their overlay owners.
  return <div ref={props.ref} data-sheen-portal={props.kind} data-sheen-ready={props.ready}
    data-sheen-theme={props.state?.theme} data-sheen-mode={props.state ? props.mode : undefined}
    data-sheen-icon-set={props.state ? iconSetForTheme(props.state.theme, props.themes) : undefined}
    data-sheen-accent={props.state?.accent} data-sheen-density={props.state?.density}
    data-sheen-radius={props.state?.radius} data-sheen-motion={props.state?.motion}
    data-sheen-locale={props.state?.locale} data-sheen-direction={props.state?.direction} />;
}

function modeSignal(): Accessor<Mode> {
  const [mode, setMode] = createSignal<Mode>("dark");
  onMount(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const update = (): void => { setMode(query.matches ? "dark" : "light"); };
    update(); query.addEventListener("change", update);
    onCleanup(() => query.removeEventListener("change", update));
  });
  return mode;
}

export interface ThemeProviderProps extends ParentProps {
  initialState?: ThemeState;
  defaultMode?: ThemeState["mode"];
  defaultTheme?: string;
  defaultAccent?: ThemeState["accent"];
  defaultDensity?: ThemeState["density"];
  defaultRadius?: ThemeState["radius"];
  defaultMotion?: ThemeState["motion"];
  direction?: ThemeState["direction"];
  locale?: string;
  themes?: readonly ThemeMetadata[];
  storageKey?: string;
  hydration?: "client" | "cookie";
  persist?: (state: ThemeState) => Promise<void>;
  onPersistenceError?: (error: unknown) => void;
  nonce?: string;
  messages?: Partial<Messages>;
}

export function ThemeProvider(props: ThemeProviderProps): JSX.Element {
  const themes = () => props.themes ?? bundledThemeMetadata;
  const defaults: ThemeState = {
    ...defaultThemeState,
    theme: props.defaultTheme ?? defaultThemeState.theme, mode: props.defaultMode ?? "dark", accent: props.defaultAccent ?? "jade",
    density: props.defaultDensity ?? "comfortable", radius: props.defaultRadius ?? "soft", motion: props.defaultMotion ?? "full",
    direction: props.direction ?? "ltr", locale: props.locale ?? "en-US",
  };
  const [state, setState] = createSignal<ThemeState>(props.initialState ?? defaults);
  const [ready, setReady] = createSignal(false);
  const [portal, setPortal] = createSignal<HTMLElement>();
  const system = modeSignal();
  const mode = createMemo(() => state().mode === "system" ? system() : state().mode === "light" ? "light" : "dark");
  let revision = 0;
  function updateDocument(): void {
    for (const [name, value] of Object.entries(attributes(state(), mode(), themes()))) document.documentElement.setAttribute(name, value);
    document.documentElement.setAttribute("data-sheen-preference", state().mode);
    document.documentElement.dir = state().direction;
    document.documentElement.lang = state().locale;
  }
  onMount(() => {
    if (props.hydration !== "cookie") {
      const root = document.documentElement;
      const snapshot = Object.fromEntries(Object.keys(defaults).map(name => [name, root.getAttribute(`data-sheen-${name}`)]));
      setState(readThemeState({ ...snapshot, mode: root.getAttribute("data-sheen-preference") ?? snapshot.mode }, defaults, themes().map(theme => theme.id)));
    }
    setReady(true);
    updateDocument();
  });
  createEffect(() => { if (ready()) updateDocument(); });
  const context = exposeTheme({
    state, defaults, resolvedMode: mode, ready, portal, tokenTarget: () => document.documentElement, themes: themes(), nonce: props.nonce, layers: createOverlayStack(),
    messages: createMemo(() => resolveMessages(englishMessages, props.messages)),
    async set(next) {
      const candidate = readThemeState({ ...state(), ...next }, defaults, context.themes().map(theme => theme.id));
      const token = ++revision;
      if (props.hydration === "cookie") {
        if (!props.persist) throw new Error("Cookie hydration requires an app persistence callback");
        try { await props.persist(candidate); }
        catch (error) { props.onPersistenceError?.(error); throw error; }
      }
      if (token !== revision) return;
      setState(candidate); updateDocument();
      if (props.hydration !== "cookie") {
        try { localStorage.setItem(props.storageKey ?? "sheen", JSON.stringify(candidate)); }
        catch (error) { props.onPersistenceError?.(error); }
      }
    },
  });
  return <ThemeContext.Provider value={context}><I18nProvider locale={state().locale} direction={state().direction}>
    {props.children}
    <PortalTarget kind="root" ready={ready()} ref={setPortal} state={ready() ? state() : undefined} mode={mode()} themes={themes()} />
  </I18nProvider></ThemeContext.Provider>;
}

export interface ThemeScopeProps extends ParentProps, ThemeOverrides { controllable?: boolean; class?: string; messages?: Partial<Messages> }

export function ThemeScope(props: ThemeScopeProps): JSX.Element {
  const parent = useTheme();
  const [local, setLocal] = createSignal<Partial<ThemeState>>({});
  const [portal, setPortal] = createSignal<HTMLElement>();
  const state = createMemo(() => resolveThemeState(parent.state(), {
    theme: props.theme ?? (props.theme === null ? null : parent.state().theme),
    mode: props.mode ?? (props.mode === null ? null : parent.state().mode),
    accent: props.accent ?? (props.accent === null ? null : parent.state().accent),
    density: props.density ?? (props.density === null ? null : parent.state().density),
    radius: props.radius ?? (props.radius === null ? null : parent.state().radius),
    motion: props.motion ?? (props.motion === null ? null : parent.state().motion),
    direction: props.direction ?? (props.direction === null ? null : parent.state().direction),
    locale: props.locale ?? (props.locale === null ? null : parent.state().locale),
    ...local(),
  }, parent.defaults));
  const system = modeSignal();
  const mode = createMemo<Mode>(() => state().mode === "system" ? system() : state().mode === "light" ? "light" : "dark");
  const themes = () => parent.themes();
  const context = exposeTheme({ ...parent, themes: parent.themes(), state, portal, tokenTarget: () => portal()?.parentElement ?? undefined, resolvedMode: mode,
    messages: createMemo(() => resolveMessages(parent.messages(), props.messages)),
    async set(next) {
    if (!props.controllable) throw new Error("ThemeScope setters require controllable=true");
    setLocal(previous => ({ ...previous, ...next }));
  } });
  const id = createUniqueId();
  const overrides = (): ThemeOverrides => {
    const result: ThemeOverrides = {};
    if (props.theme !== undefined) result.theme = props.theme;
    if (props.mode !== undefined) result.mode = props.mode;
    if (props.accent !== undefined) result.accent = props.accent;
    if (props.density !== undefined) result.density = props.density;
    if (props.radius !== undefined) result.radius = props.radius;
    if (props.motion !== undefined) result.motion = props.motion;
    if (props.direction !== undefined) result.direction = props.direction;
    if (props.locale !== undefined) result.locale = props.locale;
    return result;
  };
  return <ThemeContext.Provider value={context}><I18nProvider locale={state().locale} direction={state().direction}>
    <section id={id} class={props.class} {...attributes(state(), mode(), themes())} dir={state().direction} lang={state().locale}>
      {props.children}
      <PortalTarget kind="scope" ref={setPortal} state={state()} mode={mode()} themes={themes()} />
      <script nonce={parent.nonce} innerHTML={createScopeScript(overrides(), parent.defaults, themes())} />
    </section>
  </I18nProvider></ThemeContext.Provider>;
}
