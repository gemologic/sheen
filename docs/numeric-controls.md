# Numeric controls

`NumberField`, `Slider`, and `RangeSlider` keep application state numeric while presenting values through the effective `ThemeProvider` or `ThemeScope` locale. They do not infer locale from the browser, and a locale change outside an active edit is reflected without remounting the control.

## NumberField

`NumberField` is a text-backed ARIA spinbutton because a native number input cannot reliably display localized grouping, currency, percent, or non-Latin digits. The visible input parses and formats with `Intl.NumberFormat`; an optional hidden input submits the accepted raw number under `name`. Read committed application state or the raw hidden form value, not the localized display string.

- Arrow Up/Down changes one `step`; Page Up/Down uses `largeStep`, defaulting to ten steps. Home/End selects a finite bound.
- Enter commits the draft, Escape restores the accepted value, and blur commits any valid draft. Invalid, partial, or out-of-range text restores the last accepted value at commit.
- During an active edit, the parser and formatter stay on the locale that began the edit. A background provider update therefore cannot reinterpret a draft halfway through entry.
- Controlled owners may reject a proposed number. The draft remains available during entry and returns to the accepted value on commit.

## Slider and RangeSlider

Both controls use native range inputs for pointer, keyboard, and form behavior. `Slider` publishes one number. `RangeSlider` publishes an exact increasing two-value tuple and never silently sorts invalid application state. `minStepsBetweenThumbs` constrains each thumb using accessible per-thumb bounds. The effective locale supplies visible value text and `aria-valuetext`.

Use a slider for approximate bounded adjustment and NumberField for exact entry. If both interaction styles are necessary, keep one application-owned value and make both controls controlled rather than maintaining two drafts.

## SSR, hydration, and refresh

Server markup contains the localized spinbutton value, raw form value, range values, labels, descriptions, errors, and deterministic geometry. It does not wait for a mount signal to reveal the controls. Hydration adopts those inputs in place. If a user edits the spinbutton before JavaScript arrives, NumberField reads the live input property at mount and adopts a valid draft rather than overwriting it.

Background work must retain the component owner and publish accepted constraints or values atomically. Do not key a control by a request revision, replace it with a skeleton, or clear a controlled value while revalidating. The Loupe fixture drives a real delayed request and samples intermediate animation frames; the surface and native controls retain identity and never render blank. Chromium coverage also holds scripts, verifies complete dark server markup, and confirms hydration does not replace the marked inputs. WebKit remains a release-wide qualification boundary.
