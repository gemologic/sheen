# Authentication layouts

`@gemologic/sheen-patterns/auth` provides one structural base and two polished starters. Import `@gemologic/sheen-patterns/styles.css` once with the normal Sheen token and UI styles.

- `AuthLayout` exposes the low-level brand, authentication content, footer, and optional brand-aside slots.
- `FocusedAuthLayout` composes a centered card for one or two OAuth, OIDC, SSO, or credential actions.
- `BrandSplitAuthLayout` adds supporting product context at the logical start or end. Below 768px, CSS hides that supporting region and presents the exact same authentication owner as the focused card.

```tsx
import { Button, Link } from "@gemologic/sheen";
import { FocusedAuthLayout } from "@gemologic/sheen-patterns/auth";

export function SignIn() {
  return <FocusedAuthLayout
    brand={<Link href="/">Northstar</Link>}
    title="Welcome back"
    description="Use your organization account."
    footer={<><Link href="/support">Support</Link><Link href="/privacy">Privacy</Link></>}
  >
    <Button variant="solid" tone="accent" onClick={() => startOidc()}>Continue with SSO</Button>
  </FocusedAuthLayout>;
}
```

The application owns provider configuration, discovery, requests, pending and error state, redirects, credential policy, authorization, and session storage. A provider action is a `Button` when it starts application work. Use a `Link` only when selecting it immediately changes the URL through ordinary navigation. Do not place tokens, client secrets, authorization codes, raw provider errors, or user data in layout props.

The server must render the complete, deterministic brand and authentication content. The layout has no viewport JavaScript and does not replace content during hydration. Its split-to-focused change is CSS-only, so the form, native draft, focus target, and Solid owner survive resizing. The brand aside remains supportive: it is visually and semantically hidden on narrow screens, so required instructions and authentication errors must live with the authentication controls.

Use one authentication layout as the document's main landmark. Do not nest it inside `AppShell`, `AdminApp`, or another `main`. The required `label` on the base, or the required visible `title` on a starter, names that landmark. `asideLabel` names the complementary region in split mode. Product artwork must still follow normal text-alternative rules.
