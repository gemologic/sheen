---
"@gemologic/sheen-charts": patch
---

TimeSeries now upgrades from the SVG fallback to the canvas renderer when data is published on every animation frame. Initialization uses the prepared snapshot and delivers newer data as a normal renderer update; only definition or configuration changes restart preparation.
