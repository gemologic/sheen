# @gemologic/sheen-patterns

Application layouts for Sheen SolidJS applications. The dedicated `admin` entry provides the compact AdminApp baseline with configurable semantic topbar/sidebar placements, account and workspace controls, scoped overlays, responsive details, and four starter presets. The dedicated `auth` entry provides a low-level authentication frame plus focused and brand-split starters without pulling application-shell code.

## Install

```sh
pnpm add @gemologic/sheen-patterns @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load `@gemologic/sheen-patterns/styles.css`; AdminApp consumers also load `@gemologic/sheen-patterns/admin/styles.css`.

## Use

```tsx
import { AppShell } from "@gemologic/sheen-patterns";
import { AdminApp } from "@gemologic/sheen-patterns/admin";
import { FocusedAuthLayout } from "@gemologic/sheen-patterns/auth";
```

`AppShell` is the smaller application frame. `AdminApp` adds configurable semantic chrome, navigation, account/workspace controls, notifications, command palette, toasts, and responsive details. Router behavior is injected through the public adapter contract; optional adapters are exported from `./solid-router` and `./tanstack-router`.

See the [AdminApp guide](https://github.com/gemologic/sheen/blob/main/docs/admin-app.md), [AppShell guide](https://github.com/gemologic/sheen/blob/main/docs/app-shell.md), [authentication-layout guide](https://github.com/gemologic/sheen/blob/main/docs/auth-layout.md), and [copyable public-API Composer](https://sheen.gemologic.dev/composer) for complete configuration examples.
