# Canvas theme tokens

Canvas renderers read scoped CSS values through `useThemeTokens`, never through component-local `getComputedStyle` calls.

```ts
const colors = useThemeTokens([
  "--sheen-chart-1",
  "--sheen-color-fg-muted",
  "--sheen-chart-grid",
]);
```

The hook shares one hidden probe per effective root provider or `ThemeScope`. Root probes resolve against the document theme surface; scoped probes resolve against the actual scope wrapper, so inherited axes and scope-local editor overrides are both visible. Attribute changes and explicit refreshes schedule one read on the next animation frame. Subscribers update only when one of their requested concrete values changes.

During SSR the accessor returns an empty frozen record and no probe is emitted. A canvas component must render deterministic, fixed-size markup with an opaque CSS-token fallback and enhance that same node after mount. It must not branch the surrounding tree on token availability, browser width, storage, or `getComputedStyle`. Theme, mode, accent, and inherited-scope changes redraw the retained canvas without clearing it across a paint boundary.

Loupe alone imports `invalidateThemeTokens` from `@gemologic/sheen-charts/loupe`. Its editor owns one `<style>` element appended last, updates that element, and calls invalidation; repeated calls in one frame coalesce. Application components do not import or call that entry point.

The `/chart-tokens` fixture verifies one probe per scope, cleanup and reacquisition, inherited mode updates, twenty coalesced editor invalidations, retained canvas identity and nonblank pixels over twenty frames, and dark fixed-size server fallback through delayed hydration. These are Chromium results; WebKit remains a release qualification boundary.
