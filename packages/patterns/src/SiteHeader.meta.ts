import { defineMeta } from "@gemologic/sheen/metadata";
import type { SiteHeaderProps } from "./SiteHeader.tsx";

export default defineMeta<SiteHeaderProps>({
  name: "SiteHeader", package: "@gemologic/sheen-patterns", category: "marketing", summary: "A public-site banner with brand, primary links, actions, and a phone disclosure menu.",
  props: {
    brand: { description: "Required product identity, usually a Link to the home page with a visible or accessible name." },
    links: { description: "Primary destinations rendered as native links in one navigation landmark. `href` values are unique keys; `current` sets aria-current=\"page\"." },
    actions: { description: "Optional sign-in or sign-up controls. Use Link for destinations and Button for in-page actions." },
    navigationLabel: { description: "Accessible name of the primary navigation landmark.", default: "Main", control: { kind: "text" } },
    menuLabel: { description: "Visible text of the phone menu disclosure button.", default: "Menu", control: { kind: "text" } },
    menuOpen: { description: "Controlled phone-menu expansion. Omit for uncontrolled state." },
    defaultMenuOpen: { description: "Initial uncontrolled phone-menu expansion.", default: false },
    onMenuOpenChange: { description: "Receives proposed phone-menu expansion from the toggle, Escape, or link activation." },
    sticky: { description: "Pins the banner to the top of the scrolling page at chrome z-index.", default: false, control: { kind: "boolean" } },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-border-subtle", "--sheen-color-fg-muted", "--sheen-control-h-lg", "--sheen-space-inline-xl", "--sheen-z-chrome"],
  a11y: { role: "banner, navigation, button (aria-expanded)", keyboard: ["Tab", "Shift+Tab", "Enter", "Space", "Escape"] },
  examples: [{
    title: "Product site banner",
    imports: 'import { Link } from "@gemologic/sheen";',
    code: '<SiteHeader brand={<Link href="/" variant="quiet">Northstar</Link>} links={[{ href: "/features", label: "Features" }, { href: "/pricing", label: "Pricing", current: true }, { href: "/docs", label: "Docs" }]} actions={<Link href="/sign-in" variant="button">Sign in</Link>} />',
  }],
  guidance: {
    do: ["Render one SiteHeader per page outside the main landmark.", "Keep every primary link a real URL so the menu works before hydration on wide screens.", "Close an app-controlled menu when the route changes."],
    dont: ["Do not use SiteHeader inside AdminApp; application chrome belongs to AppShell.", "Do not branch the server markup on viewport width; the phone collapse is a container query.", "Do not put more than about six primary links in the bar."],
  },
});
