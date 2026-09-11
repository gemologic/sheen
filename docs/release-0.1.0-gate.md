# 0.1.0 release-candidate qualification

Local package qualification is complete for the first `0.1.0-rc` candidate. Loupe's live component catalog still has the documentation-site performance issue recorded below. This is evidence for reviewing and pushing the repository, not authorization to make it public, publish packages, configure DNS, or deploy GitHub Pages.

## Local evidence

- `pnpm build`, `pnpm lint`, and `pnpm typecheck` pass.
- The unit and SSR suite passes 659 cases in 157 files.
- The generated manifest covers all 179 exported components, exhaustively checks their public props, and typechecks 183 examples.
- Package-content validation passes all 10 public packages and 1,032 packed files. The isolated npm consumer installs the 10 real local tarballs and passes its type, SSR, browser-build, dependency, and production-audit checks without publishing.
- The complete Chromium inventory passes all 787 unique cases. To stay within host resource limits it was run as the 174-case route accessibility file, four complementary shards, and six component-specific accessibility cases; one overlapping inventory assertion was intentionally exercised twice. Coverage includes native keyboard paths, SSR and delayed hydration, dark first paint, refresh frame sampling, focus and draft retention, adaptive layouts, contextual overlays, automated WCAG A/AA checks, and reviewed visual states.
- Native Linux WebKit passes 216 of 218 selected cases in 4.2 minutes from the pinned Nix environment. Two cases are intentionally skipped: a Chromium-owned raster baseline and Chromium-only deterministic page-inactivity emulation.
- The heavy AdminApp benchmark passes on the current production build with 12,000 table rows, 20,000 chart points, 20 mounted table rows, and about 2,080 DOM nodes. Its initial-ready median is 384 ms; table scrolling has a 16.8 ms p99 frame, no frames over 50 ms, no Long Tasks, no unexpected layout shift, and retained application owners. Every calibrated ratio remains inside the 10 percent gate.
- The component index renders all 179 generated examples as live server markup rather than screenshots. FileDropzone now fills both its catalog card and playground, with a focused regression covering both geometries. A three-run production catalog scroll still records one 233–245 ms Long Task when the first application-pattern cards become visible. This is isolated from package consumers, but should be fixed before treating the deployed documentation site as production-polished.
- The rendered contrast fixture passes every supported combination of seven themes, dark/light modes, twelve accents, seven surfaces, and the required control and text roles.
- A high-confidence source scan found no private keys or npm, GitHub, or AWS credentials. The only environment file is `.envrc`, which contains `use nix`.

## Release safeguards

All public packages remain at the unpublished `0.0.0` sentinel. The reviewed initial Changeset creates the fixed `0.1.0` line, and release instructions require entering `rc` prerelease mode before versioning. Package-content validation rejects a stable version while workspace dependency patches remain, because those patches are not inherited by arbitrary consumers.

The CI timeouts now accommodate the measured browser and benchmark workloads. The workflows remain credential-free and do not publish packages. Package READMEs include install and usage guidance, and the package gate requires those sections for every public package.

## External gates

These steps require the repository's eventual public identity or hardware that is not available in this Linux checkout:

- review and push the initial public Git history, then run hosted Chromium, WebKit, package, and benchmark CI;
- publish the initial `0.1.0-rc.0` package set to npm's `next` tag only after separate authorization, then run clean npm, pnpm, and Bun registry-consumer smoke tests;
- qualify upstream or Sheen-owned replacements for the Solid and Kobalte patches before a stable `0.1.0` release;
- complete manual NVDA with Firefox and VoiceOver with Safari checks;
- enable GitHub Pages, configure `sheen.gemologic.dev`, and validate the deployed artifact after the public repository is pushed.

Assay remains deliberately paused and is not a `0.1.0-rc` blocker. Viz and metron dogfood remain later 1.0 evidence.

## Reproducibility boundary

`playwright.config.ts` uses a fixed worker policy and accepts `SHEEN_BROWSER_PORT`, so clean test servers do not reuse or disrupt the shared Loupe process. WebKit must run inside `default.nix`; outside that environment the bundled MiniBrowser cannot load its native GStreamer and WPE dependencies. Local Chromium and Linux WebKit results are not hosted-CI, physical Safari, Firefox, registry-publication, or deployment proof.
