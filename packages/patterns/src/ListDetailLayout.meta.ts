import { defineMeta } from "@gemologic/sheen/metadata";
import type { ListDetailLayoutProps } from "./ListDetailLayout.tsx";

export default defineMeta<ListDetailLayoutProps>({
  name: "ListDetailLayout", package: "@gemologic/sheen-patterns", category: "application", summary: "A persistent URL-driven list and detail workspace with phone focus handoff and pane scroll continuity.",
  props: {
    router: { description: "Application router adapter whose accepted location selects the active item." },
    items: { description: "Stable-ID local destinations shown in the list pane." },
    listLabel: { description: "Accessible name for the list scroll region." },
    detailLabel: { description: "Accessible name for the persistent detail scroll region." },
    listHref: { description: "Local destination used by the phone back link." },
    backLabel: { description: "Localized visible label for the phone back link." },
    detail: { description: "Accepted route detail content; keep retained content here during background refresh." },
    emptyDetail: { description: "Optional desktop content shown when the URL matches no item." },
    detailReady: { description: "False while accepted detail content cannot yet restore its saved scroll position." },
    detailPaneId: { description: "Stable restoration identity when more than one layout can coexist." },
  },
  tokens: ["--sheen-color-border", "--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-bg-hover", "--sheen-color-bg-selected", "--sheen-color-fg-muted", "--sheen-color-focus-ring", "--sheen-color-focus-ring-offset"],
  a11y: { role: "region, list, link", keyboard: ["Tab", "Shift+Tab", "ArrowUp", "ArrowDown", "Home", "End", "Enter"] },
  examples: [{ title: "URL-selected detail", setup: 'const router = { location: () => ({ pathname: "/inbox/one", search: "", hash: "" }), navigate: () => {}, block: () => () => {} };', code: '<AppShell label="Inbox" router={router}><ListDetailLayout router={router} items={[{ id: "one", label: "First", href: "/inbox/one" }]} listLabel="Messages" detailLabel="Message" listHref="/inbox" backLabel="Back to messages" detail={<article>First message</article>} /></AppShell>' }],
  guidance: { do: ["Keep the layout mounted in a route layout so list DOM and scroll survive detail navigation.", "Drive detail content from the router's accepted location and retain it during revalidation."], dont: ["Do not mirror URL selection into optimistic local state.", "Do not replace the layout or either scroll viewport during background refresh."] },
});
