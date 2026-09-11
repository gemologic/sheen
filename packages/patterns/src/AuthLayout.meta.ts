import { defineMeta } from "@gemologic/sheen/metadata";
import type { AuthLayoutProps } from "./AuthLayout.tsx";

export default defineMeta<AuthLayoutProps>({
  name: "AuthLayout", package: "@gemologic/sheen-patterns", category: "application", summary: "A deterministic authentication page frame with focused and responsive brand-split presentations.",
  props: {
    ref: { description: "Native main-landmark reference." },
    label: { description: "Required accessible name for the authentication page's main landmark." },
    brand: { description: "Persistent app-owned product identity displayed above the authentication surface." },
    children: { description: "Authentication controls and status. The application owns providers, requests, errors, redirects, and session state." },
    footer: { description: "Optional support, privacy, terms, or implementation links below the authentication surface." },
    contentWidth: { description: "Bounded authentication-content width.", default: "md", control: { kind: "select", values: ["sm", "md"] } },
    presentation: { description: "Centered focused layout or two-pane brand-split layout. The split mode requires its aside contract.", default: "focused" },
    aside: { description: "Required product context, illustration, or testimonial in brand-split mode." },
    asideLabel: { description: "Required accessible name for the brand-split complementary region." },
    asidePosition: { description: "Logical placement of the brand region in split mode.", default: "start" },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-bg-subtle", "--sheen-color-border", "--sheen-color-accent-subtle", "--sheen-space-section", "--sheen-elevation-raised"],
  a11y: { role: "main, complementary, section, heading, footer", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Low-level focused frame", imports: 'import { Button } from "@gemologic/sheen";', code: '<AuthLayout label="Sign in" brand={<strong>Northstar</strong>}><Button variant="solid" tone="accent">Continue with SSO</Button></AuthLayout>' }],
  guidance: {
    do: ["Render AuthLayout as the page's single main landmark.", "Keep provider configuration, network requests, errors, redirects, and session state in the application.", "Use complete server-known brand and authentication markup so hydration has one owner."],
    dont: ["Do not mount AuthLayout inside AppShell or another main landmark.", "Do not put secrets, authorization codes, or raw identity-provider errors in client markup.", "Do not branch the initial layout on browser width; the split collapse is CSS-only."],
  },
});
