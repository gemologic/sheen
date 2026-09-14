# Generated agent context

`pnpm manifest` is the single generation entry point. It first validates every exported component against its metadata and compiles every example, then writes these artifacts from the accepted `sheen.manifest.json`:

- `llms.txt` is the compact component index. It contains every exported component, every sheen-authored prop signature, a one-line summary, and the first validated example.
- `llms-full.txt` contains all authored prop descriptions and defaults, accessibility and keyboard guidance, semantic tokens, do/don't guidance, and every validated example.
- `apps/loupe/public/llms.txt` and `apps/loupe/public/llms-full.txt` are identical generated copies served locally and included in the GitHub Pages artifact at [`/llms.txt`](https://sheen.gemologic.dev/llms.txt) and [`/llms-full.txt`](https://sheen.gemologic.dev/llms-full.txt). The public copies are ignored and regenerated before each Pages build.
- `dist/skill/SKILL.md` and `dist/skill/llms.txt` form the vendorable skill directory. The bundled skill points agents at the same compact inventory and repeats the non-negotiable package, hydration, refresh, and pagination rules.

Do not edit any of those files by hand. Change the component metadata, example, or generator and rerun `pnpm manifest`. Generation fails before writing if the manifest shape is invalid, a component lacks a canonical example, or compact context exceeds its budget.

## Compact format and budget

The compact signatures omit inherited native DOM props and defaults. The full context retains authored defaults, and the manifest remains the exhaustive machine-readable source for inherited platform props. Common primitive types use the aliases declared at the top of `llms.txt`; quoted literal types are never rewritten.

The deterministic gate is 45,000 UTF-8 bytes. It is a model-independent proxy for the specification's under-15k-token target, chosen so a normal code-oriented tokenizer should remain below that target without coupling generation to a tokenizer package. It is not an exact token count for every model. Pinning a model and tokenizer for an exact measurement belongs with the M5 assay baseline; until that runs, report the byte result as the proven gate and the token target as pending qualification.

## Consumer use

A repository agent should read its local `AGENTS.md` first, then `llms.txt` to choose a public component and valid props. Load the relevant component section from `llms-full.txt` when defaults, accessibility behavior, tokens, or a less common example matter. Application code imports only public `@gemologic/sheen*` entries.

Generated code must preserve the server document during hydration and accepted content during refresh. Initial markup cannot depend on browser globals or a mounted signal. Revalidation keeps stable component identities, focus, drafts, scroll, expansion, and accepted query/data state until a coherent replacement is accepted. A skeleton is only for a cold region with no accepted content.

For DataTable, pagination and virtualization are independent. Continuous mode is only for complete bounded data; large, expensive, fresh, or authorization-sensitive remote results use delegated numbered pagination. A non-paginated server response must satisfy `rows.length === total`, and export or select-all must never walk hidden server pages.
