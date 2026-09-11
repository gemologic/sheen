# @gemologic/sheen-date

Locale-aware date, time, date-range, date-time, and timezone controls for Sheen SolidJS applications. Public values are serializable Sheen types; implementation dependencies stay behind the package boundary.

## Install

```sh
pnpm add @gemologic/sheen-date @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load `@gemologic/sheen-date/styles.css` after the token and base UI styles.

## Use

The package root exports `DatePicker`, `DateRangePicker`, `TimePicker`, `DateTimePicker`, `TimeZoneSelect`, and their field/calendar building blocks. Import `./core` for the immutable serializable date, time, range, timezone, and wall-time values without retaining component code.

Locale comes from the enclosing Sheen theme context and never silently falls back to per-row browser defaults. IANA timezone selection affects interpretation and formatting, while DST gaps and overlaps require an explicit resolution. Native form projections and retained async option refresh are built into the public controls.

See the [date and time guide](https://github.com/gemologic/sheen/blob/main/docs/date-time.md) for value shapes, validation, form submission, SSR, hydration, and table-filter integration.
