# Disclosures

`Collapsible` provides a labeled native button and persistent content. Use `defaultOpen` for initial uncontrolled state, or `open` and `onOpenChange` for app-owned state. A controlled owner may reject a request. Disabling the trigger does not close an already expanded section or disable its children.

The button has stable `aria-controls` and `aria-expanded` associations in SSR as well as after hydration. Enter and Space retain native button behavior. Content is always mounted to preserve drafts, but becomes inert and accessibility-hidden immediately on collapse. Closing while focus is inside returns focus to the trigger; deliberate external focus is left alone.

Persistent content is not suspended application work. Its effects remain owned and active, and its form fields remain part of native form submission even while collapsed. Apps decide whether to pause expensive work or disable fields. Collapsing is not a data reset or an authorization boundary.

Kobalte owns disclosure activation and state requests. Sheen owns the retained content presentation rather than Kobalte's presence/dimension-measuring Content wrapper. Grid rows animate between zero and one fraction, with zero duration under scoped or OS reduced motion. Initial layout does not animate. The CSS-only indicator follows logical direction.

The `/collapsible` fixture covers rejected controlled changes, retained drafts, disabled activation, native form-button behavior, delayed-hydration replay, external collapse, and dark/light RTL presentation.

## Accordion

`Accordion` coordinates labeled `AccordionItem` sections. Values must be unique and nonempty. `value`/`onValueChange` provide controlled ownership; `defaultValue` initializes uncontrolled state. Single mode accepts at most one expanded value. `multiple` allows independent sections; `collapsible={false}` prevents user collapse of the last expanded section in single mode. Controlled owners still decide the accepted state. The expanded noncollapsible trigger remains focusable with `aria-disabled` rather than native `disabled`.

Each item renders a heading containing only its trigger. Choose `headingLevel` to fit the surrounding document. Panels share Collapsible's persistent, inert-when-closed presentation and focus-restoration contract. They are not automatically regions, avoiding excessive landmarks.

Arrow Up/Down wrap among enabled headers, and Home/End move to the first/last enabled header without expanding it. Tab retains native document order. Sheen handles header navigation at the root DOM boundary, excluding nested accordions and panel controls. Kobalte's generic selectable-list keyboard handler otherwise intercepts input Home/End and does not activate its focus manager for Accordion. Kobalte still owns expansion requests and item associations; native input keys and application event cancellation remain intact.

Use stable item identities when rendering refreshed collections. If a DOM move blurs a surviving focused control, Accordion restores that control. When the focused section disappears, focus moves to the enabled header at its former position, then searches backward if necessary. With no eligible headers, the root receives programmatic focus with a visible ring; it is not an extra Tab stop. Explicit focus movement outside the accordion wins. A root-owned mutation observer and focus listener are removed on disposal. Removing an item does not change app-owned expanded values or automatically expand its successor.
