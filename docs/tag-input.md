# TagInput

`TagInput` edits an ordered list of unique, nonempty free-form strings. Use `MultiCombobox` instead when values come from an app-owned option taxonomy.

The editable query is never a submitted value. Committed tags project through a native multiple select, so `FormData` receives one entry per tag in display order. Uncontrolled instances restore `defaultValue` after an uncanceled form reset. Controlled instances only propose changes through `onValueChange`.

Enter and comma commit by default. Backspace on an empty editor removes the last tag. Each tag has a named removal button; Delete or Backspace removes it, while Alt plus an arrow key, Home, or End reorders it. Inline arrows follow the effective text direction. Removal restores focus to a surviving tag or the editor. Long unbroken values wrap inside the field rather than widening the page.

`normalize` runs synchronously before uniqueness checks and defaults to trimming. `validate` may return immediately or asynchronously. It receives the candidate, an immutable accepted-value snapshot, and an `AbortSignal`. Editing, removal, reorder, reset, and a newer validation abort the previous operation and advance a monotonic revision. A completion can publish only if it still owns that revision. Pending and rejected validation retain every accepted tag, tag node, and the editable draft. Expected rejection uses `{ kind: "rejected", message }`; an unexpected rejection reports the localized fallback and calls `onValidationError`.

Server markup includes the label, accepted tag list, native projection, descriptions, and errors. Hydration adopts a pre-hydration native editor draft without replacing the input. `disabled` removes the field from submission and interaction. `readOnly` keeps tags and the input inspectable while rejecting removal, reorder, and validation.

Proof: two focused SSR/validation cases and four Chromium cases cover ordered native submission, exact uniqueness, async acceptance/rejection/abort, accepted-node retention, draft retention, keyboard removal/reorder, RTL read-only behavior, long-token containment, delayed hydration identity, axe, and a live Chrome DevTools accessibility snapshot. Lighthouse accessibility scores 100 on the live fixture. WebKit and manual assistive-technology qualification remain release-wide work.
