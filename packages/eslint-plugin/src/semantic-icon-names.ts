// Kept in sync with @gemologic/sheen-icons by the rule fixture.
export const semanticIconNames = Object.freeze([
  "add", "remove", "close", "check", "settings", "search", "chevronDown", "chevronUp", "chevronLeft", "chevronRight",
  "arrowLeft", "arrowRight", "arrowUp", "arrowDown", "menu", "moreHorizontal", "moreVertical", "filter", "sortAscending",
  "sortDescending", "refresh", "download", "upload", "edit", "trash", "copy", "externalLink", "info", "warning", "error",
  "success", "calendar", "clock", "user", "users", "home", "inbox", "notifications", "lock", "unlock", "visible", "hidden",
] as const);

export const semanticIconNameSet: ReadonlySet<string> = new Set(semanticIconNames);
