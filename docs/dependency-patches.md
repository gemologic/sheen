# Dependency compatibility patches

The workspace applies version-pinned patches through `pnpm-workspace.yaml`. These are not inherited automatically by applications consuming the UI package. Generated apps and both dogfood migrations must carry them or qualify upstream replacements before release. No upstream issues or pull requests have been filed by this work.

`pnpm check:packages` permits the unpublished `0.0.0` sentinel and reviewed prerelease versions, but fails closed for a stable public version while this section is nonempty. This prevents a successful pack inventory from being mistaken for portable dependency qualification. The first registry build therefore remains a `0.1.0-rc` candidate until upstream releases or Sheen-owned replacement implementations pass every regression named below in clean consumers.

## Kobalte utils 0.9.2

`scrollIntoViewport` loops through scroll ancestors when document scrolling is locked. Its original next iteration calls `getScrollParent` on the current scrollable element, which returns that same element. Opening a dropdown with ArrowDown inside Loupe's fixed viewport reproduced an unresponsive browser. The ESM and CommonJS patches start the next lookup from the parent element, guaranteeing forward progress toward the document root.

## Kobalte core 0.13.13

Responsive sidebar projection exposed retained floating-layer reactivation bugs. The native failure measured Select content z-index 102, its Popper positioner 100, and the new drawer 101. Popper now observes content style/class changes to synchronize its positioning wrapper, disconnecting the observer and guarding queued work on disposal. Once visual order was fixed, the same retained Select still had pointer-events none because it reopened during its exit lifetime below the newer modal in DismissableLayer's stack. Expanded-state observation now promotes the retained layer and recomputes pointer ownership. Finally, the retained focus scope also needs promotion/resumption when it expands again, otherwise selection returns focus to the parent drawer's first input instead of its trigger. Both JSX and compiled entries carry all three changes.

The two shell-drawer-overlay cases exercise both breakpoint directions, native pointer selection, computed wrapper/pointer order, retained trigger identity, subsequent keyboard reopening/Escape, and parent drawer dismissal. Twenty-eight targeted Chromium cases pass, covering those cases plus Select, Select visuals, menus, link tooltips, and shell focus/hydration. Five targeted unit/SSR checks, UI/patterns builds, lint/typechecks, and manifest validation pass. An earlier broad run exposed outdated full-page menu screenshots: current fixture actions add vertical content absent from those baselines. Both dark and scoped light/RTL images have now been visually reviewed and regenerated for the current fixture. Menu geometry, checked states, focus outlines, submenu direction, and viewport placement remain correct. The visual test and menu/drawer-overlay regressions pass twice without snapshot updates, 24 executions, with the existing contrast and reduced-motion gates unchanged.

Patch installation required registry metadata for pnpm's release-age policy; offline mode lacked that metadata. Prefer-offline installation passed the policy and reused the existing package with zero package downloads. The first focus-scope patch attempt used compiled formatting as JSX context and was rejected; the JSX hunk now matches its installed source and installation succeeds. No dependency versions were added or upgraded. Consumers must carry the current core patch hash from pnpm-lock.yaml or qualify upstream fixes.

- Extend `I18nProvider` with an optional explicit direction. ThemeProvider and ThemeScope pass their effective locale and direction separately. Locale still controls collation and formatting; an RTL layout with English text must not silently acquire Arabic formatting or LTR keyboard behavior. Both JSX and compiled runtime entries and the declaration are patched.
- Menu Escape handling now respects `event.defaultPrevented` before recursively closing menus. Sheen's menu layers use that boundary to close only the active submenu and restore its trigger, including when a previous layer is still visually exiting. Both JSX and compiled runtime entries are patched.
- Deferred selectable-list autofocus preserves an already-focused item inside its container. A submenu establishes focus immediately when opening, but the deferred callback could later reset keyboard navigation back to the first item. The JSX and compiled entries now leave established focus alone. DropdownMenu also prevents the separate generic focus-scope autofocus, since the menu's roving-focus machinery owns initial selection.

The live `/menus` browser fixture exercises locked-document keyboard opening, nested light/RTL scopes with English locale, and one-layer dismissal. Run these regressions and the complete browser suite on any replacement version. Do not remove a patch based only on a successful build.

## Solid 1.9.15

See [hydration.md](hydration.md) for the delegated-event replay correction, pending-lazy hydration-completion guard, and delayed-JavaScript acceptance tests. Both development/production ESM and CommonJS runtime files carry the corrections.
