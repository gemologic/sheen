import { For } from "solid-js";
import { Button, Link, useTheme } from "@gemologic/sheen";
import { accents, isAccentName } from "@gemologic/sheen-tokens";

const workbenchDestinations = [
  { href: "/components", label: "Components" },
  { href: "/composer", label: "Composer" },
  { href: "/gallery", label: "Gallery" },
  { href: "/lab", label: "Laboratory" },
  { href: "/tokens", label: "Tokens" },
] as const;

const publicDestinations = [
  { href: "/components", label: "Components" },
  { href: "/composer", label: "Composer" },
  { href: "/lab", label: "Laboratory" },
  { href: "/tokens", label: "Tokens" },
  { href: "https://github.com/gemologic/sheen", label: "GitHub" },
] as const;

const primaryDestinations = import.meta.env.VITE_SHEEN_PUBLIC_SITE === "1" ? publicDestinations : workbenchDestinations;

export function hasWorkbenchHeader(pathname: string): boolean {
  return pathname === "/"
    || pathname === "/composer"
    || pathname === "/gallery"
    || pathname === "/lab"
    || pathname === "/theme-editor"
    || pathname === "/tokens"
    || pathname === "/components"
    || pathname.startsWith("/components/");
}

function isCurrentDestination(pathname: string, href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href === "/components") return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href;
}

export function WorkbenchHeader(props: { readonly pathname: string }) {
  const theme = useTheme();
  return <header class="loupe-workbench-header">
    <Link href="/" class="loupe-workbench-brand" aria-label="sheen, gemologic ui" aria-current={props.pathname === "/" ? "page" : undefined}>
      <span aria-hidden="true">S</span>
      <strong>sheen</strong>
      <small>gemologic ui</small>
    </Link>
    <nav class="loupe-workbench-nav" aria-label="Primary navigation">
      <For each={primaryDestinations}>{destination => <Link href={destination.href} aria-current={isCurrentDestination(props.pathname, destination.href) ? "page" : undefined}>{destination.label}</Link>}</For>
    </nav>
    <div class="loupe-workbench-theme-controls" aria-label="Theme controls">
      <label><span>Theme</span><select name="theme" aria-label="Theme" value={theme.state().theme} onChange={event => void theme.set({ theme: event.currentTarget.value })}>
        <For each={theme.themes()}>{item => <option value={item.id}>{item.label}</option>}</For>
      </select></label>
      <label><span>Accent</span><select name="accent" aria-label="Accent" value={theme.state().accent} onChange={event => { const name = event.currentTarget.value; if (isAccentName(name)) void theme.set({ accent: name }); }}>
        <For each={Object.keys(accents)}>{name => <option value={name}>{name[0]?.toUpperCase()}{name.slice(1)}</option>}</For>
      </select></label>
      <Button size="sm" variant="outline" onClick={() => void theme.set({ mode: theme.resolvedMode() === "dark" ? "light" : "dark" })}>
        {theme.resolvedMode() === "dark" ? "Use light" : "Use dark"}
      </Button>
    </div>
  </header>;
}
