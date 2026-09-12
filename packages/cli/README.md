# @gemologic/sheen-cli

The `sheen` command scaffolds applications, themes, and components, audits installed configuration, and synchronizes the vendorable Sheen agent skill. Creation refuses overwrite by default and supports reviewed `--dry-run` and `--force` flows.

## Install

Run the CLI without a global install, or pin it as a development dependency:

```sh
pnpm dlx @gemologic/sheen-cli --help
pnpm add -D @gemologic/sheen-cli
```

## Use

```sh
pnpm sheen new app ./my-app --dry-run
pnpm sheen doctor
pnpm sheen sync-skill
```

`new` never overwrites an existing target. `--force` first prints the diff; `--dry-run` performs no writes. `sync-skill` touches only its managed directory and refuses to replace uncommitted content. Generated applications include the dark-first theme and keyboard hydration scripts, public package boundaries, lint configuration, and `sheenRuntime()` setup. They retain the ordinary shared Solid core and need no consumer compatibility patches.

See the [CLI guide](https://github.com/gemologic/sheen/blob/main/docs/cli.md) for every scaffold, exit behavior, manifest output, doctor diagnostics, and skill synchronization contract.
