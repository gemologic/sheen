# Date and time contract

`@gemologic/sheen-date` supplies calendar, date, time, timezone, range, and instant controls without putting date engines in `@gemologic/sheen` or `@gemologic/sheen-table`. Import `@gemologic/sheen-date/styles.css` with the components you use. Ark UI 5.39.1 and `@internationalized/date` 3.12.3 are internal implementation dependencies. Their runtime modules and public types do not cross the package boundary.

## Serializable values

Public state never uses JavaScript `Date`, dependency-owned values, or locale-formatted strings. It uses frozen Sheen values:

- `CalendarDate` is an ISO calendar day with integer `year`, `month`, and `day` fields.
- `Time` is a wall-clock time with millisecond precision and no date or timezone.
- `DateRange` is an inclusive ordered pair of `CalendarDate` values.
- `TimeZone` contains one validated IANA identifier.
- `DateTime` is one UTC epoch-millisecond instant plus its presentation timezone.
- `WallDateTime` combines a calendar day, wall time, and timezone only while resolving an instant.

Construct, parse, validate, and serialize values through the public `create*`, `read*`, `parse*`, and `serialize*` functions. Form projections are stable ISO strings: `YYYY-MM-DD`, `HH:mm:ss.SSS`, `start/end`, and `instant[Area/Location]`. Formatting always takes the explicit locale from component props or `ThemeProvider`. The `calendar` option changes presentation, not the stored ISO date.

## DST and timezone changes

`resolveWallDateTime` rejects repeated and nonexistent wall times by default. An ambiguous result exposes its earlier and later instants; a nonexistent result exposes the instants bracketing the skipped wall time. The app or `DateTimePicker` must choose `earlier`, `later`, or `compatible` explicitly before an instant is committed. The picker renders this as a live, non-color alert with concrete choices.

Changing zones also requires an explicit policy:

- `preserve-instant` keeps the epoch milliseconds and changes only the displayed zone.
- `preserve-wall` keeps the entered calendar and clock fields, then resolves them in the new zone. It can therefore require DST resolution.

Timezone option labels and search data are app-owned. `TimeZoneSelect` does not fetch, infer a device timezone, or persist a preference. During an app-owned refresh, pass `pending` while retaining the accepted option array. The open list, query, focus, and input owner remain present until one coherent replacement is accepted. Transport errors stay separate from field validation and can expose an app retry.

## Components and forms

`Calendar` is the always-visible keyboard calendar. `DateField` and `TimeField` are segmented fields. `DatePicker`, `DateRangePicker`, and `TimePicker` add transient selection layers. `DateTimePicker` composes a date, time, and explicit timezone without creating a second data owner. Every accepted value can project through `name` and `form`; an incomplete range or unresolved wall time retains the previous accepted form value rather than publishing a partial value.

Calendar constraints use `minValue`, `maxValue`, and `isDateUnavailable`. Popup layers mount in the nearest theme portal, inherit its complete effective axes, restore focus on Escape, and become bottom sheets below the phone breakpoint without duplicating their owner. Server output contains the complete closed control and accepted value. Hydration reuses it, including a user draft typed before scripts arrive.

For table filters, inject `dateFilterEditor` through `filterBar.dateEditor`. The table package retains its dependency-free native date fallback and never imports the date package. Both editors publish UTC day boundaries to the same filter AST, URL state, saved views, server requests, selection snapshots, and export criteria.

## Delivery and performance

Copied built-package consumers currently measure 5,575 bytes gzip for core values, 30,901 bytes for `DateField`, 55,301 bytes for `DatePicker`, and 99,641 bytes for `DateTimePicker`, under gates of 6,200, 34,000, 61,000, and 110,000 bytes. The core consumer retains no Solid, Ark UI, or Sheen UI runtime. A built table consumer retains no date, Ark, or Adobe date modules.

`pnpm benchmark:date` builds production Loupe and runs five fresh Chromium contexts. It measures picker opening, keyboard date acceptance, timezone filtering, a real 350ms retained-results refresh, and explicit DST resolution. Medians are divided by a same-context CPU calibration and fail above a versioned 10-percent allowance. Each operation also fails on p99 frames above 20ms, a frame above 50ms, a Long Task, unexpected layout shift, or owner/query loss. The local bootstrap capture reported about 16.8ms p99, no Long Tasks, no frames above 50ms, no unexpected layout shift, and retained owners in every operation. The first accepted `ubuntu-24.04` CI artifact must deliberately replace the local baseline; local timings are not user-facing guarantees.
