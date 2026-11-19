# CodeBlock

Import `CodeBlock` from `@gemologic/sheen-code` and the package stylesheet. The component renders complete deterministic source on the server. Syntax highlighting is optional: run `highlightCode` from `@gemologic/sheen-code/highlight` in a loader or build step, then pass its serializable result through `highlighted`. Importing the renderer does not retain Shiki.

```ts
import { highlightCode } from "@gemologic/sheen-code/highlight";
import { json, typescript } from "@gemologic/sheen-code/languages";

const highlighted = await highlightCode({ code, language: "ts", languages: [typescript, json], signal });
```

`highlightCode` uses Shiki's fine-grained core with the JavaScript regex engine, so no oniguruma wasm ships. The engine, the `github-light-default` and `github-dark-default` themes, and each grammar load through their own dynamic imports on first use and are then shared by later calls. Grammars come only from the definitions an application imports from `@gemologic/sheen-code/languages`, so a build emits chunks for those grammars and nothing else. `language` is a grammar id or alias from the declared `languages`; TypeScript rejects anything else, and an undeclared name rejects at runtime. The result's `language` is the name you passed, so give `CodeBlock` the same value. Pass `signal` to drop superseded work: an aborted call rejects with the signal's reason instead of resolving.

Tokens carry separate light and dark colors that the renderer exposes as `--sheen-code-token-light` and `--sheen-code-token-dark`, so switching color mode recolors the retained markup without highlighting again.

`filename`, `label`, and `showLanguage` populate the header. `copyable` copies the exact `code` value through the browser Clipboard API, never reconstructed DOM text or line numbers. Copy failures expose localized safe feedback and may be reported through `onCopyError`; raw browser errors are not rendered.

`wrapToggle` exposes a native pressed button. Use `wrapped` with `onWrappedChange` for controlled ownership, or `defaultWrapped` for local ownership. Changing wrap state, color mode, or same-shape accepted source keeps the preformatted region and surviving indexed line owners mounted.

`highlightedLines` accepts one-based line numbers and inclusive `{ start, end }` ranges. Invalid, reversed, or out-of-bounds ranges fail before rendering. Highlighting uses background plus a logical boundary, gains a system-color boundary in forced-colors mode, and supplies a localized assistive description such as `Highlighted lines: 2–4`. It is supplementary emphasis, not a replacement for visible error or status text.

Code-specific English defaults are exported as `englishCodeMessages`. Typed overrides use the enclosing `ThemeProvider.messages`, so locale, scope, and direction retain one owner while code-only strings stay out of UI-only bundles.
