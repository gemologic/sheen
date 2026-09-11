# ESLint plugin

`eslint-plugin-sheen` ships a flat `recommended` configuration under the `sheen` namespace. The first implemented rule family enforces design-token and directionality boundaries:

- `no-raw-color` rejects hex and CSS color functions plus common palette utility classes. Validated files under `packages/tokens`, `src/themes`, and `*.theme.*` are explicit authoring boundaries.
- `no-tier1-in-component` rejects raw color ramps, size scales, radius scales, font-size scales, and shadow primitives outside those theme boundaries.
- `no-arbitrary-spacing` rejects arbitrary spacing/geometry utility values unless the value references a `--sheen-*` token.
- `no-hardcoded-radius` rejects fixed radius utilities, CSS declarations, and object-style `borderRadius` values that do not use a semantic control/surface/component role.
- `no-physical-properties` rejects left/right utility classes, CSS declarations, and object-style physical properties in favor of inline-start/inline-end equivalents.
- `no-native-control` rejects bare interactive HTML controls outside the UI, table, and pattern implementation packages.
- `no-direct-primitive-import` keeps Kobalte, Corvu, TanStack, uPlot, and D3 runtime imports inside their owning Sheen wrappers.
- `no-props-destructure` rejects Solid component parameter and local props destructuring that would break reactive property reads.
- `require-class-merge` requires components accepting native or explicit `class` props to pass the class through `cn()`.
- `no-computed-style` reserves direct computed-style reads for the chart theme-token bridge; consumers use `useThemeTokens()`.
- `no-document-scroll` rejects raw desktop document-scroll recipes and directs authors to `AppShell` plus constrained `ScrollArea` panes.
- `no-mount-animation` rejects common layout entrance classes while allowing named transient-layer implementation files.
- `require-icon-label` requires nondecorative icons to have labels and icon-only actions to use `IconButton` or a tooltip.
- `no-unknown-icon` validates literal `<Icon name>` values against the same semantic registry list checked against the runtime package in tests.
- `no-dynamic-icon-name` warns when `<Icon>` cannot be statically inlined; deliberate runtime selection uses `<DynamicIcon>`.
- `no-unsafe-seam` warns at every greppable `__unsafe_*` upstream escape hatch.
- `prefer-layout-primitive` warns on common flex/grid/gap recipes that should be `Stack`, `Row`, or `Grid`.

The package uses ESLint 10's flat plugin shape and declares ESLint as a peer. Correctness rules are errors in `recommended`; dynamic icon names, unsafe seams, and layout substitutions are warnings. Eighty-two RuleTester cases cover valid and invalid token, template, object-style, component, import-boundary, reactivity, theme-bridge, shell, motion, icon, and layout behavior. Separate tests prove the lint/runtime icon registries agree and the recommended config exposes every implemented rule at the intended severity.

These rules inspect JavaScript/TypeScript literals, template quasis, JSX source, identifiers, and relevant object properties. They do not parse standalone CSS. The specification assigns CSS enforcement to Stylelint, which remains unfinished. Computed class-name fragments, aliased JSX components, and values produced outside the local AST are also beyond static proof; doctor describes this limit rather than claiming it audited runtime behavior.
