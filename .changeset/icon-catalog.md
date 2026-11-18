---
"@gemologic/sheen-icons": minor
---

The semantic icon catalog grows from 42 to 257 names covering navigation, actions, files, communication, media, commerce, charts, devices, development (`terminal`, `gitBranch`, `database`, `server`, `cloud`, `key`, `api`), status, people, text formatting, layout, time, location, and brand marks (`githubLogo`, `googleLogo`, and others). The existing 42 names and their artwork are unchanged. Each name has a `<Name>Icon` export and an `@gemologic/sheen-icons/icons/<kebab-name>` entry.

Phosphor covers every name. The 113 names without Radix artwork render their Phosphor glyph in Radix themes, resolved at build time, so every name has exactly one glyph per set. `iconRegistry` entries for those names have no `radix` key, and the package root now exports `fallbackIconSet` and the `IconSources` type. `DynamicIcon` retains the larger registry, now about 58KB gzip; single literal and per-icon imports stay around 1.3KB gzip.
