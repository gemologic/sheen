# Built UI consumer checks

Run `pnpm check:consumers` after building tokens, UI, and table. `pnpm check` already runs this command after its build/typecheck stages. The same runner now checks the table pagination package's copied exports and declarations with real Node execution; see [table pagination](table-pagination.md).

The UI check creates a temporary consumer outside the repository, copies the UI package manifest and dist directory, and initially copies only src/styles.css from source. It copies the tokens package separately and links the currently installed direct dependencies and Solid peer. No UI TypeScript/TSX implementation is available during the built-JavaScript check.

The consumer imports `@gemologic/sheen` by package name. Its strict typecheck exercises Button, Link, buttonVariants, cn, and SheenPolymorphicProps, including expected errors for missing Link href, Button href, and anchor props on the native button type seam. As with the existing private-theme check, skipLibCheck skips dependency declaration internals; the consumer's own positive and negative cases remain checked.

A Vite build with explicit browser/module/production conditions selects the built JavaScript entry, with Solid kept external as a peer. The verifier checks that copied Button.js and Link.js survive tree shaking, their public exports remain, and no Kobalte, TanStack, uPlot, or source TSX code survives in the output. It also checks emitted CSS contains component rules after resolving UI styles, token core, and obsidian CSS through public package exports. The temporary directory is removed on success or failure.

After that check, the runner copies UI source into the temporary package and builds the same consumer with the installed Solid Vite plugin. Assertions require the copied source Button.tsx and Link.tsx, reject mixing the UI dist entry into the retained source graph, verify public exports/CSS, and retain the same headless/chart/table exclusions. The Solid peer remains external in both client builds.

Finally, an SSR build with the Solid plugin compiles the copied package's source entry, then Node executes that bundle. The runtime test renders a loading native Button and button-styled native Link with renderToString, checks their native tags and attributes, and confirms there is no document global. This qualifies the source-conditioned SSR route, not server rendering from the browser-compiled dist entry.

Current proof: both isolated UI client builds, consumer typechecks, source SSR execution, and existing private-theme runtime checks pass; repository lint/typechecks pass. No production code changed for these checks.

## Native client execution

After building the packages and installing Chromium, run `pnpm test:consumer-browser`. This runs the checks above plus two standalone production client bundles, one per entry condition. Unlike the tree-shaking fixture, these include Solid rather than externalizing it. A real loopback HTTP server serves only the generated assets and fixture document; there is no Loupe router, workspace alias, or development server. Bundle graph assertions require the copied package's expected Button/Link implementation.

Chromium verifies reactive Enter/Space button activation, retained focus and node identity, loading/disabled native-click suppression, loaded token/component CSS, and button-styled Link's native Enter versus Space behavior. It fails on browser exceptions. These are mount/interaction checks, not SSR hydration tests. Both entry conditions pass, including a final rerun with focus and appearance assertions. Lint/typechecks pass.

The Chromium CI job runs this after browser installation. Failures retain traces in test-results/consumers and the job uploads test-results. Browser contexts, servers, and temporary copied packages are closed or removed on failure as well as success. The build-only `check:consumers` command does not require an installed browser.

Boundaries: this reuses the installed dependency closure, including local patches. It does not install an npm tarball from a clean registry, hydrate these isolated client bundles, exercise every exported component, validate dependency declarations internally, establish gzip budgets, or qualify another browser engine. Those remain separate release obligations. Hosted CI has not been observed running this change.
