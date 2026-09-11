# Sheen CLI

`@gemologic/sheen-cli` installs the `sheen` executable. The M5 implementation exposes app/theme/component scaffolds, manifest forwarding, vendored-skill synchronization, and doctor.

## Application scaffold

```sh
sheen new app my-application
```

The command creates one guarded `my-application/` tree. It uses SolidStart 2's `vite.config.ts` entry, file routes, Solid Router adapter, fixed `AppShell`, scoped `ThemeProvider`, shortcut provider, toaster mount, recommended Sheen lint configuration, a pinned Nix development environment, and a starter route. The blocking theme script and keyboard hydration script are emitted ahead of interactive markup. Client hydration is the default, fresh installs are dark, and the starter imports all seven themes and twelve independent accents with visible theme, accent, and mode controls.

The scaffold vendors the generated Sheen skill/context and exact currently qualified Solid 1.9.15, Kobalte core 0.13.13, and Kobalte utils 0.9.2 patches. Its `pnpm-workspace.yaml` activates those patches. Removing or changing them requires rerunning the delayed-hydration and overlay regressions described in [hydration](hydration.md) and [dependency patches](dependency-patches.md).

The generated ESLint config requires a description on every disable directive. `sheen doctor` separately scans source files for `sheen/*` disable directives, reports exact per-file counts, and fails above ten. This is static text inspection: it does not evaluate generated sources, custom ESLint processors, configuration overrides, or runtime behavior, so the lint run remains the correctness gate.

A focused test writes the full nineteen-file plan into an isolated temporary directory, resolves the already-installed pinned dependencies, typechecks every generated TypeScript source, and runs a real SolidStart production build. It also compares the generated patch bytes with the workspace sources. The test does not install or publish packages, and it does not prove the future `^1.0.0` package range exists in a registry.

## Theme and component scaffolds

Run scaffolds from the repository root, or pass `--root <path>` explicitly:

```sh
sheen new theme midnight-blue
sheen new component AccountCard
```

Themes are written to `src/themes/<name>.ts`. They derive both modes from the validated Obsidian theme, retain dark as the default, and pass the resulting definition through `defineTheme`. Component scaffolds write the component, metadata, demo, and SSR test together under `packages/ui/src/primitives/`.

Names and destinations are validated before any write. If one planned file already exists, the entire live operation refuses. `--dry-run` prints unified replacement previews and writes nothing. `--force` computes and prints every diff before the first overwrite; it does not grant access outside the selected root.

Generated components intentionally begin as plain semantic containers. Authors must choose the final element, role, tokens, styles, props, interactions, and browser coverage for the actual component contract. The scaffold is a complete, compiling starting point, not an accessibility claim about the eventual feature.

## Skill synchronization

```sh
sheen sync-skill
sheen sync-skill --target path/to/skills/sheen
sheen sync-skill --dry-run
```

The default destination is `.agents/skills/sheen`. This is a Sheen convention, not a claim that every agent host discovers the same repository-local path; consumers can set an explicit relative destination. Absolute paths and paths escaping the repository root are rejected.

The command reads the skill bundled into the installed CLI package and touches only the selected skill directory. A missing target is installed. An identical target is a no-op. Before replacing a changed target, the command requires it to be tracked and clean in the containing Git repository. Untracked, ignored, modified, or non-Git targets fail closed, and there is deliberately no `--force` bypass. `--dry-run` remains read-only even for a target that could not safely be replaced.

The tests exercise initial installation, identical no-op behavior, non-Git edit refusal, destination containment, dry-run behavior, scaffold refusal, and pre-write force previews. Temporary real Git repositories also prove clean tracked replacement and fail-closed modified, untracked, and ignored paths while confirming that sibling consumer files are untouched. The checkout itself remains read-only to Git throughout.

## Manifest and doctor

`sheen manifest` runs the selected repository's own `pnpm manifest` script, preserving that repository as the authority for metadata and context generation. It accepts only `--root`; failures retain the underlying command output.

`sheen doctor` is read-only. It checks required runtime package placement, aligned declared and installed Sheen versions, ThemeProvider ownership, theme and keyboard hydration bootstraps, required token/component/pattern styles, and the ten-suppression ceiling. Diagnostics include a stable code, path, and actionable message, and any error produces exit status 1.

Pass `--shortcut-snapshot <relative-path>` to ingest an application-exported array of complete `ShortcutBinding` records, or an object with a `bindings` array. Doctor validates the record shapes and active same-scope identities, then prints the full binding table including shadowed registrations. Static source inspection cannot discover runtime-computed registrations, so doctor reports no snapshot rather than inventing a binding inventory when the option is absent.
