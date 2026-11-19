---
"@gemologic/sheen-code": minor
---

`highlightCode` now uses Shiki's fine-grained core with the JavaScript regex engine instead of `shiki/bundle/web`. The web bundle turned every grammar, every theme, and the oniguruma wasm into consumer chunks (124 files, 5.3 MB for an app highlighting one language); an app now emits only the highlight entry, the engine, the two GitHub default themes, and the grammars it declares (5 files, about 375 KB for TypeScript).

Breaking: `highlightCode` requires a `languages` array of grammar definitions imported from the new `@gemologic/sheen-code/languages` entry, and `language` must be an id or alias of one of them. Migrate `highlightCode({ code, language: "ts" })` to `highlightCode({ code, language: "ts", languages: [typescript] })` with `import { typescript } from "@gemologic/sheen-code/languages"`. The same web-bundle languages and aliases are available, and an undeclared language rejects. `HighlightCodeOptions` is now generic over the declared languages, `BundledLanguage` from `shiki/bundle/web` is no longer referenced, and `CodeLanguage`/`CodeLanguageName` are exported. `highlightCode` also accepts an optional `signal`; aborted calls reject with its reason. Output tokens and the light/dark token variables are unchanged.
