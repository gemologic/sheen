# Built UI consumer checks

Run `pnpm check:consumers` after building tokens, UI, and table. `pnpm check` already runs this command after its build/typecheck stages. The same runner now checks the table pagination package's copied exports and declarations with real Node execution; see [table pagination](table-pagination.md).

The UI check creates a temporary consumer outside the repository, copies the UI package manifest, dist, and vendored runtime, and initially copies only src/styles.css from source. It copies the tokens package separately and links the currently installed direct dependencies and Solid peer. No UI TypeScript/TSX implementation is available during the built-JavaScript check.

The consumer imports `@gemologic/sheen` by package name. Its strict typecheck exercises Button, Link, buttonVariants, cn, and SheenPolymorphicProps, including expected errors for missing Link href, Button href, and anchor props on the native button type seam. As with the existing private-theme check, skipLibCheck skips dependency declaration internals; the consumer's own positive and negative cases remain checked.

A Vite build with explicit browser/module/production conditions selects the built JavaScript entry, with Solid kept external as a peer. The verifier checks that copied Button.js and Link.js survive tree shaking, their public exports remain, and no Kobalte, TanStack, uPlot, or source TSX code survives in the output. It also checks emitted CSS contains component rules after resolving UI styles, token core, and obsidian CSS through public package exports. The temporary directory is removed on success or failure.

After that check, the runner copies UI source into the temporary package and builds the same consumer with the installed Solid Vite plugin. Assertions require the copied source Button.tsx and Link.tsx, reject mixing the UI dist entry into the retained source graph, verify public exports/CSS, and retain the same headless/chart/table exclusions. The Solid peer remains external in both client builds.

Finally, an SSR build with the Solid plugin compiles the copied package's source entry, then Node executes that bundle. The runtime test renders a loading native Button and button-styled native Link with renderToString, checks their native tags and attributes, and confirms there is no document global. This qualifies the source-conditioned SSR route, not server rendering from the browser-compiled dist entry.

These checks cover exported types, source-conditioned SSR, and tree shaking. They are distinct from clean npm installation and native runtime qualification below.

## Native client execution

After building the packages and installing Chromium, run `pnpm test:consumer-browser`. This runs the checks above plus two standalone production client bundles, one per entry condition, using the packed setup plugin. Unlike the tree-shaking fixture, these include Solid rather than externalizing it. A real loopback HTTP server serves only the generated assets and fixture document; there is no Loupe router, workspace alias, or development server. Bundle graph assertions require the expected Button/Link/Dialog/Popover implementation, the owned DOM renderer, no original renderer, and exactly one shared Solid core.

Chromium verifies reactive Enter/Space button activation, retained focus and node identity, loading/disabled native-click suppression, loaded token/component CSS, and button-styled Link's native Enter versus Space behavior. Nested Dialog/Popover exit animations remain attached for ten seconds while focus returns and Escape dismisses the parent. Browser exceptions fail the check. These are mount/interaction checks, not SSR hydration tests.

The Chromium CI job runs this after browser installation. Failures retain traces in test-results/consumers and the job uploads test-results. Browser contexts, servers, and temporary copied packages are closed or removed on failure as well as success. The build-only `check:consumers` command does not require an installed browser.

Boundaries: this reuses the installed dependency closure. It does not install clean npm tarballs, hydrate the production bundles, exercise every exported component, validate dependency declaration internals, or qualify another browser engine.

## Clean packed npm runtime

Run `pnpm test:npm-consumer:browser` to pack all ten packages and install them with npm into an isolated temporary application, without workspace patches or links. It runs the two production interaction fixtures above and verifies unpatched Solid plus the absence of original Kobalte/CMDK dependencies. A real Vite development server then hydrates server-rendered public components with all scripts delayed and with only a lazy route delayed. Both intervals require retained drafts/focus/server-node identity, exactly-once event replay, and frame continuity. Development graph assertions require the owned renderer and reject the original.

`pnpm test:npm-consumer` retains the build/install-only variant for environments without Chromium. Hosted Check and publication preparation run the browser variant. These are npm tarball tests, not evidence of a published registry version or clean pnpm/Bun smoke tests. WebKit and the broader application interactions remain separate gates.
