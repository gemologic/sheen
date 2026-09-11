# Chart palette qualification

Every theme supplies eight opaque categorical colors through `chart-1` to `chart-8`. `defineTheme` qualifies consecutive colors at a CAM16-UCS distance of at least 18 under the standard sRGB viewing condition and at least 7 after severity-1 protanopia, deuteranopia, and tritanopia simulation. The color-vision transforms use the linear-light matrices published with [Machado, Oliveira, and Fernandes (2009)](https://pubmed.ncbi.nlm.nih.gov/19834201/); the appearance conversion follows [Li et al. (2017)](https://onlinelibrary.wiley.com/doi/full/10.1002/col.22131).

These thresholds are Sheen policy gates, not a claim that every observer perceives a fixed just-noticeable difference. `packages/tokens/test-fixtures/palette-reference.json` pins the conversion references, severity-one red transforms, policy values, and bundled dark/light minima. Changing the model, matrices, policy, or palette therefore requires an explicit fixture rebaseline.

`validateChartPalette(tokens)` returns all failed gated simulations. `auditChartPalette(tokens)` additionally reports the weakest arbitrary pair and an achromatopsia preview for every adjacent and arbitrary pair. Achromatopsia has no color-only pass threshold because a grayscale transform cannot establish color as an accessible encoding. Charts retain visible labels and the native data table, and use line style, marker shape, direct annotation, or another non-color encoding whenever a distinction is essential. Loupe renders the complete audit rather than reducing it to a misleading pass badge.

The bundled palette minima are:

| Mode | Normal | Protanopia | Deuteranopia | Tritanopia |
| --- | ---: | ---: | ---: | ---: |
| Dark | 32.87 | 14.78 | 7.53 | 7.67 |
| Light | 19.06 | 18.00 | 9.05 | 7.41 |
