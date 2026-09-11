import { defineMeta } from "@gemologic/sheen/metadata";
import type { FocusedAuthLayoutProps } from "./AuthLayout.tsx";

export default defineMeta<FocusedAuthLayoutProps>({
  name: "FocusedAuthLayout", package: "@gemologic/sheen-patterns", category: "application", summary: "A centered authentication card for concise OAuth, OIDC, SSO, or credential flows.",
  props: {
    ref: { description: "Native main-landmark reference." },
    brand: { description: "Persistent app-owned product identity above the authentication card." },
    title: { description: "Required visible page heading and accessible main-landmark name.", control: { kind: "text" } },
    description: { description: "Optional provider, organization, or next-step guidance below the heading." },
    children: { description: "App-owned authentication controls and live status." },
    footer: { description: "Optional support and legal destinations below the card." },
    headingLevel: { description: "Semantic heading level for the visible authentication title.", default: 1 },
    contentWidth: { description: "Bounded card width.", default: "sm", control: { kind: "select", values: ["sm", "md"] } },
  },
  tokens: ["--sheen-color-bg", "--sheen-color-bg-raised", "--sheen-color-border", "--sheen-color-fg-muted", "--sheen-space-section", "--sheen-elevation-raised"],
  a11y: { role: "main, section, heading, footer", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "OIDC-only sign in", imports: 'import { Button } from "@gemologic/sheen";', code: '<FocusedAuthLayout brand={<strong>Northstar</strong>} title="Welcome back" description="Use your organization account."><Button variant="solid" tone="accent">Continue with SSO</Button></FocusedAuthLayout>' }],
  guidance: {
    do: ["Prefer this layout when authentication is one or two provider actions.", "Give every provider action explicit visible text.", "Keep errors beside the controls and retain the same form owner while retrying."],
    dont: ["Do not turn a provider button into a link unless it performs immediate URL navigation.", "Do not imply that the layout performs OAuth or stores credentials.", "Do not replace the card with a spinner during authentication."],
  },
});
