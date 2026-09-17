# Fonts

Import `@gemologic/sheen-tokens/fonts.css` before the token and component styles. Studio uses locally bundled Inter Variable (100–900), with 400 reading, 510 UI/metric, and 590 heading weights. Identifiers retain IBM Plex Mono 400. Other themes retain IBM Plex Sans 400/600. Inter comes from the official v4.1 release under SIL OFL 1.1; exact sources, hashes, and both licenses ship alongside the fonts. No external font request is required.

The font stylesheet uses `font-display: optional`. A fast local load uses the selected face on the first render; a slow load keeps the fallback for that navigation instead of swapping glyphs and moving component content after first paint. Preload the faces used by the initial theme before the application stylesheet. Studio applications use `@gemologic/sheen-tokens/fonts/InterVariable.woff2?url` and the Mono asset; Plex applications use:

```tsx
import plexMonoRegular from "@gemologic/sheen-tokens/fonts/IBMPlexMono-Regular.woff2?url";
import plexSansRegular from "@gemologic/sheen-tokens/fonts/IBMPlexSans-Regular.woff2?url";
import plexSansSemibold from "@gemologic/sheen-tokens/fonts/IBMPlexSans-SemiBold.woff2?url";

<link rel="preload" href={plexSansRegular} as="font" type="font/woff2" crossorigin="anonymous" />
<link rel="preload" href={plexSansSemibold} as="font" type="font/woff2" crossorigin="anonymous" />
<link rel="preload" href={plexMonoRegular} as="font" type="font/woff2" crossorigin="anonymous" />
```

The `sheen new app` scaffold includes these preloads. Apps that accept fallback metrics can omit them. Do not change the display policy to `swap`, because that reintroduces a visible late refresh.

The unmodified font binaries, exact upstream commit, SHA-256 digests, and SIL Open Font License 1.1 are retained in the published package under `dist/fonts/`.

Numeric component roles use both `font-variant-numeric: tabular-nums` and the explicit OpenType `"tnum"` feature. Formatting remains locale-aware and app-owned; the font rule only keeps digits aligned.

Use `NumberText` for locale-aware grouping, explicit precision, and quieter fraction/unit parts. It preserves the complete localized text order, including signs and currency placement, and does not change the underlying numeric value. `Stat` accepts the same options through `format` when `value` is numeric. Studio body text is 16px, metadata at least 12px, dense UI text 14px, page titles 20px, and metric numerals 30px. Compact density changes spacing, not Studio's text size.
