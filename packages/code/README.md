# @gemologic/sheen-code

CodeBlock, DiffViewer, LogViewer, and JSONViewer components for Sheen SolidJS applications. Syntax highlighting and advanced viewers use separate entries so applications can keep heavy engines out of unrelated bundles.

## Install

```sh
pnpm add @gemologic/sheen-code @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load `@gemologic/sheen-code/styles.css` after the token and base UI styles.

## Use

Import `CodeBlock` from the package root. `DiffViewer`, `LogViewer`, and `JSONViewer` also have dedicated `./diff-viewer`, `./log-viewer`, and `./json-viewer` entries so an application can keep unrelated viewers out of a route chunk. Syntax highlighting is asynchronous and retained plain-code markup remains available while highlighting loads or fails.

All viewers provide keyboard-operable search/copy behavior and bounded or virtualized large-content rendering. Application code supplies the content; Sheen never fetches remote source implicitly.

See the [CodeBlock guide](https://github.com/gemologic/sheen/blob/main/docs/code-block.md) and [advanced viewer guide](https://github.com/gemologic/sheen/blob/main/docs/advanced-viewers.md) for rendering, accessibility, localization, refresh, and bundle boundaries.
