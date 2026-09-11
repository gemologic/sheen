# Fonts

Import `@gemologic/sheen-tokens/fonts.css` before the token and component styles to use Sheen's bundled IBM Plex faces. The package ships IBM Plex Sans 400/600 and IBM Plex Mono 400 as same-origin WOFF2 assets. Those are the only weights used by the default type tokens.

The font stylesheet uses `font-display: optional`. A fast local load uses Plex on the first render; a slow load keeps the fallback for that navigation instead of swapping glyphs and moving component content after first paint. Applications that require Plex on the first paint should import the public font assets with the bundler's URL suffix and emit font preloads before the application stylesheet:

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
