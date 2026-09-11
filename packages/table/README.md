# @gemologic/sheen-table

Compact, accessible DataTable and QueryBuilder components for Sheen SolidJS applications. Numbered pagination, bounded continuous data, virtualization, search, filtering, sorting, selection, export adapters, and conflict-safe edits share one engine.

## Install

```sh
pnpm add @gemologic/sheen-table @gemologic/sheen @gemologic/sheen-tokens solid-js
```

Load `@gemologic/sheen-table/styles.css` after the token and base UI styles.

## Use

Import `DataTable` and `FilterBar` from the package root, `QueryBuilder` from `./query-builder`, or framework-independent state and serialization helpers from `./core`. Define columns through Sheen's typed column contract; TanStack types are not part of the public API.

Numbered pagination and virtualization solve different problems. Use continuous client mode only for complete bounded data. Large or expensive remote queries should use numbered server pagination. Server export and select-all-matching remain application-owned and never cause the table to walk every page.

See the [DataTable guide](https://github.com/gemologic/sheen/blob/main/docs/data-table-page.md), [search syntax](https://github.com/gemologic/sheen/blob/main/docs/table-search.md), [pagination policy](https://github.com/gemologic/sheen/blob/main/docs/table-pagination.md), and [request contract](https://github.com/gemologic/sheen/blob/main/docs/table-requests.md).
