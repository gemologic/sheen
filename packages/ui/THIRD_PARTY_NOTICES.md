# Vendored runtime notices

Sheen contains modified copies of these third-party packages. Sheen's MIT license does not replace their original copyright notices or the additional notices covering their incorporated sources.

| Included code | Upstream version | License and attribution |
| --- | --- | --- |
| Kobalte core | 0.13.13 | `vendor/kobalte-core/LICENSE.md` and `NOTICE.txt` |
| Kobalte utils | 0.9.2 | `vendor/kobalte-utils/LICENSE.md` and `NOTICE.txt`, retained from the shared Kobalte repository |
| Solid DOM renderer, not its reactive core | 1.9.15 | `vendor/solid-web/LICENSE` |
| CMDK Solid adapter | 1.2.0 | `vendor/cmdk-solid/LICENSE`, including the original CMDK attribution |

Gemologic Sheen modifies Kobalte's scroll traversal, locale/direction handling, retained layer ordering, focus restoration, dismissal ownership, and deferred autofocus. It modifies Solid's delegated event replay and pending-lazy hydration guard; its renderer's JSX declarations reference the shared Solid peer instead of the original package-relative path. Kobalte references in the vendored backend and CMDK adapter are rewritten to package-private imports. Runtime source-map references are removed because upstream source maps are not distributed.

Solid's server entries delegate to the application's pinned peer renderer rather than copying its request-context state. Generated code is normalized to one final newline, including chunks containing only removed source-map references.

`vendor/origins.json` records the exact upstream npm tarballs and their SHA-512 integrity. The repository's `patches/` files are generation inputs, not patches consumers install. Regenerate with `pnpm vendor:runtime`; the package gate checks `vendor/integrity.json` against every generated file and input patch. No vendoring download or patch application runs during consumer installation.

See the repository's [runtime compatibility guide](https://github.com/gemologic/sheen/blob/main/docs/dependency-patches.md) for the maintenance and browser qualification contracts.
