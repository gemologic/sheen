export interface SearchEvaluation<Row> {
  readonly locale: string;
  readonly columns: readonly string[];
  readonly getValue: (row: Row, column: string) => unknown;
  /** Enables the portable leading-apostrophe literal-phrase syntax. */
  readonly exactMatch?: boolean;
}
export interface SearchMatch<Row> {
  readonly row: Row;
  /** Lower is better. Equal ranks preserve source order. */
  readonly rank: number;
}

export type SearchMode = "ranked" | "exact";

export interface SearchQuery {
  readonly mode: SearchMode;
  readonly value: string;
}

interface PreparedSearch {
  readonly columns: readonly string[];
  readonly mode: SearchMode;
  readonly terms: readonly string[];
  readonly normalize: (value: string) => string;
}

interface IndexedSearchMatch<Row> extends SearchMatch<Row> {
  readonly index: number;
}

function rankText(text: string, query: string): number | null {
  if (text === query) return 0;
  if (text.startsWith(query)) return 1;
  if (text.includes(query)) return 2;
  let position = 0;
  for (const character of query) {
    const found = text.indexOf(character, position);
    if (found < 0) return null;
    position = found + character.length;
  }
  return 3;
}

/**
 * Parse DataTable's serializable search syntax. A leading apostrophe selects a
 * literal contiguous phrase; two leading apostrophes escape a literal apostrophe.
 */
export function parseSearchQuery(query: string, exactMatch = false): SearchQuery {
  const value = query.trim();
  if (!exactMatch || !value.startsWith("'")) return Object.freeze({ mode: "ranked", value });
  if (value.startsWith("''")) return Object.freeze({ mode: "ranked", value: value.slice(1) });
  return Object.freeze({ mode: "exact", value: value.slice(1).trim() });
}

/** Encode a match mode without adding a second field to persisted TableState. */
export function formatSearchQuery(value: string, mode: SearchMode): string {
  const query = value.trim();
  if (mode === "exact") return `'${query}`;
  return query.startsWith("'") ? `'${query}` : query;
}

function prepareSearch<Row>(query: string, options: SearchEvaluation<Row>): PreparedSearch {
  const locale = Intl.getCanonicalLocales(options.locale)[0];
  if (!locale) throw new Error("Search requires an explicit locale");
  const columns = [...options.columns];
  if (columns.some(column => typeof column !== "string" || !column.trim()) || new Set(columns).size !== columns.length) throw new Error("Search columns must be unique nonempty IDs");
  const normalize = (value: string): string => value.normalize("NFC").toLocaleLowerCase(locale).normalize("NFC");
  const parsed = parseSearchQuery(query, options.exactMatch ?? false);
  const normalized = normalize(parsed.value);
  const terms = parsed.mode === "exact" ? (normalized ? [normalized] : []) : [...new Set(normalized.split(/\s+/u).filter(Boolean))];
  return Object.freeze({ columns: Object.freeze(columns), mode: parsed.mode, terms: Object.freeze(terms), normalize });
}

function evaluateSearch<Row>(rows: readonly Row[], prepared: PreparedSearch, options: SearchEvaluation<Row>): readonly IndexedSearchMatch<Row>[] {
  const onlyTerm = prepared.terms.length === 1 ? prepared.terms[0] : undefined;
  const matches: IndexedSearchMatch<Row>[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row === undefined) throw new Error(`Missing search row at index ${rowIndex}`);
    if (onlyTerm !== undefined) {
      let rank: number | null = null;
      for (const column of prepared.columns) {
        const value = options.getValue(row, column);
        const text = typeof value === "string" ? prepared.normalize(value) : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
        if (text === null) continue;
        const score = prepared.mode === "exact" ? (text.includes(onlyTerm) ? 0 : null) : rankText(text, onlyTerm);
        if (score !== null && (rank === null || score < rank)) rank = score;
        if (rank === 0) break;
      }
      if (rank !== null) matches.push({ row, rank, index: rowIndex });
      continue;
    }
    const best: Array<number | null> = Array.from({ length: prepared.terms.length }, () => null);
    for (const column of prepared.columns) {
      const value = options.getValue(row, column);
      const text = typeof value === "string" ? prepared.normalize(value) : typeof value === "number" && Number.isFinite(value) ? String(value) : null;
      if (text === null) continue;
      let complete = true;
      for (let termIndex = 0; termIndex < prepared.terms.length; termIndex++) {
        const current = best[termIndex] ?? null;
        if (current === 0) continue;
        const term = prepared.terms[termIndex];
        if (term === undefined) continue;
        const score = rankText(text, term);
        if (score !== null && (current === null || score < current)) best[termIndex] = score;
        if (best[termIndex] !== 0) complete = false;
      }
      if (complete) break;
    }
    let rank = 0;
    let missing = false;
    for (const score of best) {
      if (score === null) { missing = true; break; }
      rank += score;
    }
    if (!missing) matches.push({ row, rank, index: rowIndex });
  }
  matches.sort((left, right) => left.rank - right.rank || left.index - right.index);
  return matches;
}

/** AND ranked query terms across configured columns, or one literal phrase within a single column when enabled. */
export function searchClientRows<Row>(rows: readonly Row[], query: string, options: SearchEvaluation<Row>): readonly SearchMatch<Row>[] {
  const prepared = prepareSearch(query, options);
  if (prepared.terms.length === 0) return rows.map(row => ({ row, rank: 0 }));
  return evaluateSearch(rows, prepared, options).map(({ row, rank }) => ({ row, rank }));
}

/** Package-internal row-only path avoids allocating public match records for an inactive query. */
export function searchClientRowValues<Row>(rows: readonly Row[], query: string, options: SearchEvaluation<Row>): readonly Row[] {
  const prepared = prepareSearch(query, options);
  if (prepared.terms.length === 0) return rows;
  return evaluateSearch(rows, prepared, options).map(match => match.row);
}
