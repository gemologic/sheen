# Tabs

`Tabs` displays one panel at a time. Supply a required `label`, ordered `items` with stable unique values, and a panel-rendering child function. Use `defaultValue` for uncontrolled initial selection or `value`/`onValueChange` for app-owned selection. A controlled owner can reject a request; its value must identify an enabled item. Update controlled selection together with collection changes that remove or disable that item.

Automatic activation selects during arrow navigation. Choose `activationMode="manual"` when selection starts expensive or remote work; arrows then move focus and Enter/Space selects. Horizontal arrows follow scoped direction; vertical lists use Up/Down. Disabled tabs are skipped. Home/End select the edge focus target according to activation mode. URL navigation belongs in links, not tab selection.

Panels stay mounted and are hidden/inert while inactive. Stable values preserve their DOM and local drafts through label refreshes and ordinary selection changes. Hidden panels still own effects and native form fields; applications own pausing expensive work and disabling fields. Explicit IDs and associations exist in server markup. The `/tabs` delayed-JS test verifies pre-hydration drafts and queued activation survive DOM reuse.

When an uncontrolled selected item is removed or disabled, selection moves to the enabled item at its former position, searching forward and then backward. The accepted fallback becomes the new uncontrolled state, so restoring an old item does not reactivate it. A replacement selection emits `onValueChange`; an empty collection has no selection. Controlled owners must update their selection atomically with removal or disablement.

Refreshes preserve surviving focused controls. If selection hides the focused panel or removal deletes its focused control, focus moves to the selected tab. An empty collection receives programmatic root focus with a visible ring. Deliberate outside focus is never replaced, and queued recovery is canceled by owner disposal.

Each active panel is a native Tab stop, including panels containing controls. This consistent entry point exposes the panel's accessible name and introductory content before entering its controls, and is identical before and after hydration. Inactive panels are excluded by native hidden/inert semantics. Shift+Tab returns through the same order. Panel focus is visibly indicated; the root itself is only a programmatic fallback.

Initial implementation qualification covers SSR, activation modes, controlled rejection, disabled skipping, RTL/vertical navigation, hydration replay, and selection/removal focus recovery. The `/tabs-visual` fixture exercises panel entry and a bounded theme/orientation matrix. All-theme component-state contrast and cross-browser qualification remain open. This is not a completed navigation milestone.
