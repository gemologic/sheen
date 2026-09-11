# Client sorting

`parseSorting(value, columns)` validates an ordered array of `{ column, direction: "asc" | "desc" }` against sheen-owned `SortColumn` definitions. Unknown fields, unknown/duplicate columns, malformed/sparse entries, and invalid directions fail. The returned state and entries are frozen copies. This is a serializable state fragment, not the complete versioned table-state envelope.

`sortClientRows(rows, sorting, columns, { locale, getValue })` sorts the complete filtered client view before pagination. Earlier keys have higher priority. Ties preserve input order, including when multiple keys compare equal. Source arrays and row objects are not mutated; an empty sort retains the original array. Each active accessor is evaluated once per row, outside the comparison loop. Accessor failures propagate.

Text sorting uses NFC and an explicit supported locale with `Intl.Collator`, variant sensitivity, and numeric comparison of embedded digit sequences. Thus item2 precedes item10. Sorting does not reuse the filter's lowercase substring matcher. Enum columns can expose a text sort definition independently of their enum filter definition. Custom comparators and schema-defined enum order are not implemented yet.

Number/date columns accept finite numbers without coercion. Dates use epoch milliseconds within the supported Date range. Null, undefined, empty strings, type-invalid values, and nonfinite/out-of-range numbers sort last in either direction. Whitespace is ordinary text. Two missing values tie on that key and continue to the next key.

The [ECMA-402 collation contract](https://tc39.es/ecma402/#sec-intl.collator.prototype.compare) orders text according to effective locale and options; locale data can differ across server/browser engines. Hydration must reuse serialized accepted row order, not independently re-sort server HTML on the first client render. Server adapters must explicitly match the chosen ordering semantics and add a unique stable tiebreaker for paginated queries. Client-side stability alone does not make remote offset pages consistent across concurrent writes.

Never sort a fetched server page locally while presenting it as a global order. This separation follows [TanStack's sorting guidance](https://tanstack.com/table/v8/docs/guide/sorting). The future table adapter delegates server sorting with the rest of the query and resets pagination on sort changes.

Tests cover validation/immutability, mixed-direction keys, stable ties, row identity, missing values in both directions, Swedish/German collation, natural text order, epoch dates, sort-before-pagination, and accessor evaluation/failures. Built-package consumers exercise the public state/parser/sorter exports. This is not DataTable header interaction, server sorting integration, or calibrated performance qualification.
