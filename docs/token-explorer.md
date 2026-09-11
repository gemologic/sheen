# Loupe token explorer

`/tokens` renders every generated tier-1 primitive and every tier-2 semantic token. Values come from computed custom properties through the same frame-batched bridge used by canvas charts, so theme, accent, and mode changes update the retained rows without treating TypeScript defaults as browser truth.

Component consumers are generated from `sheen.manifest.json` by `tools/build-manifest.ts` into the compact `apps/loupe/src/generated/token-consumers.ts` map. The route does not ship the multi-megabyte full manifest to the browser. Tier-1 entries explicitly report that direct component consumption is prohibited; a search matches token names, CSS variable names, and manifest component names.

The contrast table crosses every semantic foreground role with every semantic surface/fill role. It composites translucent backgrounds over `color-bg`, reports WCAG 2.2 ratios, and visually flags values below the general 4.5:1 text diagnostic. Those flags do not replace the role-aware compiler gates: disabled/decorative text and structural boundaries have different contracts, while control boundaries and focus indicators use their 3:1 rules in `validateContrast`.

The chart section renders all eight current chart colors under normal vision, protanopia, deuteranopia, tritanopia, and achromatopsia using the same Machado-based simulation code as token validation. Simulation changes color only; it does not claim that color alone is sufficient encoding.

Signed perceptual Lc output remains intentionally pending. The official algorithm is beta software with integration, naming, polarity, attribution, and example-display conditions. Use the maintained official implementation after dependency approval and include the required interface guidance rather than embedding an untracked algorithm fork. The relevant primary references are the [official implementation](https://github.com/Myndex/apca-w3), [integration conditions](https://github.com/Myndex/SAPC-APCA/blob/master/documentation/minimum_compliance.md), and [Why APCA](https://git.apcacontrast.com/documentation/WhyAPCA).

Three focused model tests cover complete catalog construction, consumer filtering, matrix membership/scoring, and preview classification. Three Chromium tests cover computed values, live theme refresh with retained row identity, all five chart palettes, consumer/name filtering, and server-rendered row retention through delayed JavaScript.
