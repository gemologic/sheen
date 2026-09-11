export type IconSetName = "radix" | "phosphor";

export const iconRegistry = Object.freeze({
  add: { radix: "plus", phosphor: "plus" },
  remove: { radix: "minus", phosphor: "minus" },
  close: { radix: "cross-2", phosphor: "x" },
  check: { radix: "check", phosphor: "check" },
  settings: { radix: "gear", phosphor: "gear-six" },
  search: { radix: "magnifying-glass", phosphor: "magnifying-glass" },
  chevronDown: { radix: "chevron-down", phosphor: "caret-down" },
  chevronUp: { radix: "chevron-up", phosphor: "caret-up" },
  chevronLeft: { radix: "chevron-left", phosphor: "caret-left" },
  chevronRight: { radix: "chevron-right", phosphor: "caret-right" },
  arrowLeft: { radix: "arrow-left", phosphor: "arrow-left" },
  arrowRight: { radix: "arrow-right", phosphor: "arrow-right" },
  arrowUp: { radix: "arrow-up", phosphor: "arrow-up" },
  arrowDown: { radix: "arrow-down", phosphor: "arrow-down" },
  menu: { radix: "hamburger-menu", phosphor: "list" },
  moreHorizontal: { radix: "dots-horizontal", phosphor: "dots-three" },
  moreVertical: { radix: "dots-vertical", phosphor: "dots-three-vertical" },
  filter: { radix: "mixer-horizontal", phosphor: "funnel" },
  sortAscending: { radix: "arrow-up", phosphor: "sort-ascending" },
  sortDescending: { radix: "arrow-down", phosphor: "sort-descending" },
  refresh: { radix: "reload", phosphor: "arrows-clockwise" },
  download: { radix: "download", phosphor: "download-simple" },
  upload: { radix: "upload", phosphor: "upload-simple" },
  edit: { radix: "pencil-1", phosphor: "pencil-simple" },
  trash: { radix: "trash", phosphor: "trash" },
  copy: { radix: "copy", phosphor: "copy" },
  externalLink: { radix: "external-link", phosphor: "arrow-square-out" },
  info: { radix: "info-circled", phosphor: "info" },
  warning: { radix: "exclamation-triangle", phosphor: "warning" },
  error: { radix: "cross-circled", phosphor: "x-circle" },
  success: { radix: "check-circled", phosphor: "check-circle" },
  calendar: { radix: "calendar", phosphor: "calendar-blank" },
  clock: { radix: "clock", phosphor: "clock" },
  user: { radix: "person", phosphor: "user" },
  users: { radix: "group", phosphor: "users" },
  home: { radix: "home", phosphor: "house" },
  inbox: { radix: "envelope-closed", phosphor: "envelope" },
  notifications: { radix: "bell", phosphor: "bell" },
  lock: { radix: "lock-closed", phosphor: "lock" },
  unlock: { radix: "lock-open-1", phosphor: "lock-open" },
  visible: { radix: "eye-open", phosphor: "eye" },
  hidden: { radix: "eye-closed", phosphor: "eye-slash" },
} satisfies Readonly<Record<string, Readonly<Record<IconSetName, string>>>>);

export type IconName = keyof typeof iconRegistry;
export const iconNames: readonly IconName[] = Object.freeze(Object.keys(iconRegistry).filter(isIconName));

export function isIconName(value: string): value is IconName {
  return Object.hasOwn(iconRegistry, value);
}
