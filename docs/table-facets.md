# Client enum facets

`countClientFacets(rows, columns, { getValue })` counts enum options in the complete filtered client result before pagination. Non-enum columns are skipped. It returns an immutable array of `{ column, options: [{ value, count }], missing }`, preserving schema column/option order and including options with zero matches. Duplicate declared options count once. Map-based accumulation safely handles values such as `__proto__` and `constructor` without object-property collisions.

Null and undefined contribute to `missing`. An empty string is a countable option only when explicitly declared by the enum schema. Other undeclared or non-string values fail with the column and row index rather than silently disappear. Accessor failures propagate. Rows and schema are never mutated; each enum accessor is read once per input row.

These counts describe the current result, not hypothetical results after changing an option. The caller applies the full filter/search first. This helper does not strip the facet's own predicates from arbitrary nested AND/OR/NOT trees, which could change their meaning. A future alternative-results facet mode must have an explicit query contract shared with the server. Server-mode facets come from the accepted server response and must not be recomputed from one loaded page.

Five tests cover full-result counts before pagination, declared order/zero counts, missing data, empty results, immutable output, duplicate/special option strings, invalid data/schema, sparse rows, and accessor failures. An isolated built-package consumer also verifies the public helper. FilterBar rendering, response-facet validation, full table-state integration, and calibrated facet performance remain unfinished.
