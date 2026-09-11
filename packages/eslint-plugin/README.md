# eslint-plugin-sheen

Lint rules for safe, accessible, and package-boundary-correct Sheen applications. Rules cover semantic tokens, logical properties, wrapper boundaries, Solid prop reactivity, shell layout, transient motion, icons, and explicit unsafe seams.

## Install

```sh
pnpm add -D eslint eslint-plugin-sheen
```

## Use

Add the flat recommended configuration after the language configuration for application source:

```js
import sheen from "eslint-plugin-sheen";

export default [sheen.configs.recommended];
```

The recommended rules prevent raw colors and tier-one token use, physical CSS properties, direct primitive-engine imports, Solid props destructuring, unlabelled meaningful icons, fixed-shell document scrolling, and unmarked unsafe seams. Intentional suppressions require a justification comment and remain visible to `sheen doctor`.

See the [lint guide](https://github.com/gemologic/sheen/blob/main/docs/lint.md) for rule scope, CSS limitations, migration advice, and the suppression budget.
