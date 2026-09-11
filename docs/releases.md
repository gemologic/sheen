# Releases and migrations

## Version ownership

All ten public packages use one fixed SemVer version. The packages remain separate so applications can install and bundle only the engines they need; release-number alignment does not merge their dependency graphs. Every pull request includes a reviewed Changeset. A change with no public release impact uses an empty Changeset rather than inventing a package bump.

The checkout uses `0.0.0` only as an unpublished development sentinel. Before the first version pull request, enter Changesets prerelease mode with `pnpm changeset pre enter rc`; the reviewed initial Changeset then creates the `0.1.0-rc` line instead of a stable `0.1.0`. `pnpm check:packages` rejects any stable public version while `pnpm-workspace.yaml` still declares dependency patches.

Squash-merge ordinary pull requests so one reviewed change and its release note remain attributable as one main-branch commit. The automated workflow updates a version pull request only. It has no publish script, disables Git tags and GitHub releases, and has no npm credential. Actual publication requires separate authorization after the release candidate passes the repository gates and a human reviews generated versions, changelogs, package inventories, licenses, and provenance settings.

## Deprecations

A public symbol or prop deprecation must include all of the following in the pull request that introduces it:

- a TypeScript `@deprecated` annotation naming the supported replacement;
- metadata and generated guidance that use the replacement in every primary example;
- a changelog entry with the reason, replacement, and earliest removal version;
- a development-only warning when runtime detection is reliable and does not alter SSR markup or hydration;
- at least one complete minor release of overlap before removal.

Warnings are once per deprecated contract, never emitted in production, and never required to make an old path work. Deprecations do not excuse keeping two internal implementations. Both public paths should resolve to the same maintained behavior until the old path is removed in the next eligible major release.

## Breaking changes and codemods

A mechanical breaking change ships a versioned codemod in the CLI before or with the major release. Each codemod has real input/output fixtures, preserves formatting outside the edited syntax, is idempotent, reports every changed file, supports a no-write preview, and refuses an ambiguous transformation with an actionable manual migration message. It never rewrites an explicit `__unsafe_*` escape hatch silently.

Changes that require product judgment, such as moving an AdminApp semantic zone or choosing a server pagination policy, receive a step-by-step migration guide and cannot claim automated coverage. The release note identifies the exact manual decisions. Removing a patched dependency also requires the corresponding real hydration or interaction regression to pass against the replacement before the patch and migration note disappear.

## Package-content gate

`pnpm check:packages` runs `pnpm pack --dry-run --json` for every public package. It verifies repository and public-provenance metadata, fixed version alignment, all export and binary targets, package README and MIT license identity, and the absence of tests, demos, metadata declarations, local configuration, and lock files. The token package additionally proves that the three IBM Plex files, their pinned source record, and the SIL Open Font License are present. The CLI package proves that its generated skill and all application patches are present. The command only inspects inventories and never creates a tarball or publishes.

## Packed npm consumer gate

Run `pnpm build && pnpm test:npm-consumer` for a release candidate. The second command creates real tarballs for all ten packages, installs those tarballs together with the pinned consumer toolchain into a clean temporary project through npm, verifies the complete dependency tree and high-severity audit boundary, typechecks the public entries, imports the Node-oriented token/CLI/lint entries, and builds both compiled and Solid-source browser graphs with Vite. It removes the temporary project afterward and never contacts npm's publish endpoints.

This complements, rather than replaces, the copied-artifact and browser consumer gates. A successful packed install proves that workspace ranges were rewritten into a coherent installable package set. It does not make the workspace-level Solid and Kobalte patches inherit into a consuming application, and it does not qualify their hydration and overlay regressions. Those patches remain a stable-publication blocker until upstream or replacement implementations pass the documented browser contracts.

## npm bootstrap and ongoing publication

The first release should be the Changesets-generated fixed-version prerelease `0.1.0-rc.0` on the `next` tag, not `latest` or `1.0.0`. Changesets begins a new prerelease line at `.0`; do not hand-edit the generated version to make it `.1`. Review the version pull request, run all release gates, run the packed npm consumer gate, and inspect every generated tarball before publication. The initial package set must be published directly because [npm staged publishing cannot create a brand-new package](https://docs.npmjs.com/staged-publishing/). Use the `@gemologic` organization for scoped packages and `--access public`; `eslint-plugin-sheen` remains an intentionally unscoped global package name.

`.github/workflows/publish.yml` is the only publication path. It is manual, accepts runs only from `main`, and serializes all publications. Its credential-free prepare job installs without a dependency cache, runs the repository and packed-consumer gates, checks the requested fixed version, creates the ten tarballs with pnpm, and records their SHA-512 digests. It then uploads those exact artifacts. The publish job cannot start until the protected `npm` environment is approved; after approval it downloads the artifacts and verifies their complete file set, requested version, distribution tag, publication mode, and digests again. Prereleases are restricted to `next` and stable versions to `latest`.

`pnpm build:packages && pnpm test:release-artifacts` exercises the same pack-and-verify path locally against a disposable real Changesets prerelease checkout. It removes the checkout and tarballs afterward and never calls an npm publication endpoint.

Configure the GitHub `npm` environment with a `main` deployment-branch restriction, required reviewers, prevented self-review, and administrator bypass disabled. The one-time bootstrap mode additionally requires an environment secret named `NPM_TOKEN`: a shortest-lived npm granular write token with bypass 2FA enabled. It exists only to create the ten new package records. Bootstrap safely resumes a partial run by skipping an already-published package only when the registry integrity exactly matches the approved tarball; any different bytes fail closed. Remove the secret immediately after all ten package records exist. Neither Pages nor the version-pull-request workflow needs an npm secret.

After every package exists, configure one [npm trusted-publisher](https://docs.npmjs.com/trusted-publishers/) relationship per package with organization `gemologic`, repository `sheen`, workflow `publish.yml`, and environment `npm`. Restrict each relationship to staged publishing. Ongoing `stage` mode receives only `contents: read` and `id-token: write`, uses GitHub-hosted runners and npm OIDC, and has no npm token. A maintainer reviews each staged package and approves it with 2FA, then smoke-tests installation from `next` before promoting a stable release to `latest`.

Registry smoke tests must use clean temporary applications and the exact release-candidate version. Install the package set independently with npm, pnpm, and Bun; typecheck imports; build production Vite client and Solid SSR entries; launch at least the UI, AdminApp, DataTable, date overlay, and chart routes; and rerun the dependency-patch hydration/overlay regressions. Package-manager installation alone is not tree-shaking or runtime evidence. Do not promote the candidate when one client succeeds and another was not run.

The version-PR workflow stays credential-free and non-publishing. The manual publication workflow may live in the initial public history, but must remain undispatched until that history is reviewed, the environment is protected, and the requested release commit passes hosted CI. npm trust is bound to the exact repository, workflow filename, and environment identity.

The repository should be public before the bootstrap run. Public source makes package repository links and automatic provenance auditable. Before changing visibility, review the prospective first commit for ignored specifications, generated artifacts, third-party notices, credential-shaped content, internal hostnames, private URLs, and personal data. The first public sequence is:

1. Create and review the real `main` history, make the GitHub repository public, and require the hosted Check and Pages checks on `main`.
2. Commit Changesets prerelease mode with `pnpm changeset pre enter rc`, then merge the generated version pull request that sets every public package to `0.1.0-rc.0`.
3. Confirm hosted Chromium, WebKit, package, consumer, benchmark, and Pages jobs for the exact release commit. Complete the still-manual assistive-technology evidence separately.
4. Protect the GitHub `npm` environment, add the temporary environment-level `NPM_TOKEN`, and dispatch `publish.yml` from `main` with version `0.1.0-rc.0`, tag `next`, and mode `bootstrap`.
5. Download and inspect the prepared artifact before approving the environment. After the run, verify all ten package pages, provenance, public visibility, repository links, and `next` tags, then remove `NPM_TOKEN`.
6. Configure the ten npm trusted publishers for `publish.yml` and staged-only publication. Use `stage` mode for every later version.

Changing visibility, pushing commits, configuring GitHub or npm settings, approving the environment, and publishing remain separate external actions. The repository workflow prepares and verifies them but does not perform them without an explicit manual dispatch and protected-environment approval.
