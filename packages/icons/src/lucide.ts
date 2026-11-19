import type { IconName } from "./registry.ts";

/**
 * Common lucide kebab-case names mapped to the Sheen semantic name with the same intent, for apps migrating stored icon names.
 * Lucide data is not a workspace dependency, so this map is explicit rather than generated. Names without a faithful Sheen
 * intent (spinners, shapes, most brand marks) are deliberately absent and resolve to undefined.
 */
export const lucideIconAliases = Object.freeze({
  // Core
  "plus": "add", "minus": "remove", "x": "close", "check": "check", "settings": "settings", "search": "search",
  "chevron-down": "chevronDown", "chevron-up": "chevronUp", "chevron-left": "chevronLeft", "chevron-right": "chevronRight",
  "arrow-left": "arrowLeft", "arrow-right": "arrowRight", "arrow-up": "arrowUp", "arrow-down": "arrowDown",
  "menu": "menu", "ellipsis": "moreHorizontal", "more-horizontal": "moreHorizontal", "ellipsis-vertical": "moreVertical", "more-vertical": "moreVertical",
  "funnel": "filter", "filter": "filter", "arrow-up-narrow-wide": "sortAscending", "sort-asc": "sortAscending",
  "arrow-down-wide-narrow": "sortDescending", "sort-desc": "sortDescending", "refresh-cw": "refresh", "rotate-cw": "refresh",
  "download": "download", "upload": "upload", "pencil": "edit", "pencil-line": "edit", "edit": "edit", "edit-2": "edit",
  "trash": "trash", "trash-2": "trash", "copy": "copy", "external-link": "externalLink", "info": "info",
  "triangle-alert": "warning", "alert-triangle": "warning", "circle-x": "error", "x-circle": "error",
  "circle-check": "success", "circle-check-big": "success", "check-circle": "success", "check-circle-2": "success",
  "calendar": "calendar", "clock": "clock", "user": "user", "users": "users", "house": "home", "home": "home", "inbox": "inbox",
  "bell": "notifications", "lock": "lock", "lock-open": "unlock", "unlock": "unlock", "eye": "visible", "eye-off": "hidden",
  // Navigation and direction
  "arrow-up-right": "arrowUpRight", "chevrons-up-down": "chevronsUpDown", "chevrons-left": "chevronDoubleLeft", "chevrons-right": "chevronDoubleRight",
  "log-in": "login", "log-out": "logout", "maximize": "expand", "maximize-2": "expand", "expand": "expand",
  "minimize": "collapse", "minimize-2": "collapse", "shrink": "collapse", "grip-vertical": "dragHandle", "move": "move",
  "arrow-left-right": "swap", "arrow-up-down": "sort", "layout-dashboard": "dashboard", "panel-left": "sidebar", "sidebar": "sidebar",
  "compass": "compass", "globe": "globe", "circle-help": "help", "help-circle": "help", "command": "command", "keyboard": "keyboard",
  // Actions
  "circle-plus": "addCircle", "plus-circle": "addCircle", "circle-minus": "removeCircle", "minus-circle": "removeCircle",
  "undo": "undo", "undo-2": "undo", "redo": "redo", "redo-2": "redo", "history": "history", "link": "link", "unlink": "unlink",
  "share-2": "share", "share": "export", "send": "send", "save": "save", "printer": "print", "scissors": "cut", "clipboard": "clipboard",
  "square-pen": "compose", "archive": "archive", "pin": "pin", "pin-off": "unpin", "bookmark": "bookmark", "star": "star", "heart": "heart",
  "flag": "flag", "tag": "tag", "zoom-in": "zoomIn", "zoom-out": "zoomOut", "sliders-horizontal": "sliders", "sliders-vertical": "sliders",
  "sliders": "sliders", "ban": "blocked", "sparkles": "sparkle", "sparkle": "sparkle", "zap": "lightning", "rocket": "rocket",
  "wrench": "wrench", "puzzle": "extension", "power": "power", "qr-code": "qrCode",
  // Files and documents
  "file": "file", "file-text": "fileText", "file-plus": "fileAdd", "file-minus": "fileRemove", "file-code": "fileCode",
  "file-image": "fileImage", "file-spreadsheet": "fileCsv", "file-archive": "fileArchive", "folder": "folder", "folder-open": "folderOpen",
  "folder-plus": "folderAdd", "paperclip": "attachment", "sticky-note": "note", "book": "book", "book-open": "book", "package": "package",
  // Communication
  "mail": "mail", "mail-open": "mailOpen", "message-circle": "chat", "message-square": "comment", "reply": "reply", "forward": "forward",
  "phone": "phone", "at-sign": "at", "hash": "hash", "quote": "quote", "megaphone": "megaphone", "bell-off": "notificationsOff",
  "bot": "bot", "mic": "microphone", "mic-off": "microphoneOff", "headset": "headset", "headphones": "headset", "languages": "translate",
  // Media
  "image": "image", "camera": "camera", "video": "video", "play": "play", "pause": "pause", "circle-stop": "stop",
  "skip-forward": "skipForward", "skip-back": "skipBack", "volume-2": "volume", "volume-1": "volumeLow", "volume-x": "mute", "music": "music",
  // Commerce and billing
  "shopping-cart": "cart", "store": "store", "credit-card": "creditCard", "wallet": "wallet", "receipt": "receipt", "landmark": "bank",
  "dollar-sign": "currencyDollar", "euro": "currencyEuro", "percent": "percent", "gift": "gift", "truck": "truck",
  // Data and charts
  "chart-column": "barChart", "chart-bar": "barChart", "bar-chart": "barChart", "bar-chart-2": "barChart", "chart-line": "lineChart",
  "line-chart": "lineChart", "chart-pie": "pieChart", "pie-chart": "pieChart", "trending-up": "trendUp", "trending-down": "trendDown",
  "activity": "activity", "gauge": "gauge", "table": "table",
  // Devices and connectivity
  "monitor": "desktop", "laptop": "laptop", "smartphone": "mobile", "tablet": "tablet", "cpu": "cpu", "wifi": "wifi", "wifi-off": "wifiOff",
  // Development and infrastructure
  "code": "code", "code-xml": "code", "braces": "codeBlock", "terminal": "terminal", "square-terminal": "terminal",
  "git-branch": "gitBranch", "git-commit-horizontal": "gitCommit", "git-commit": "gitCommit", "git-merge": "gitMerge",
  "git-pull-request": "gitPullRequest", "git-fork": "gitFork", "diff": "gitDiff", "bug": "bug", "database": "database", "server": "server",
  "cloud": "cloud", "cloud-upload": "cloudUpload", "cloud-download": "cloudDownload", "cloud-off": "cloudOff", "key": "key", "key-round": "key",
  "plug": "api", "webhook": "webhook", "workflow": "workflow", "network": "network", "layers": "layers", "logs": "logs",
  "shield": "shield", "shield-check": "shieldCheck",
  // Status
  "circle-alert": "alert", "alert-circle": "alert", "hourglass": "pending", "badge-check": "verified", "lightbulb": "lightbulb",
  // People and organizations
  "circle-user": "account", "user-circle": "account", "user-plus": "userAdd", "user-minus": "userRemove", "user-check": "userCheck",
  "contact": "contacts", "id-card": "idCard", "scale": "legal", "briefcase": "briefcase", "smile": "emoji",
  "thumbs-up": "thumbsUp", "thumbs-down": "thumbsDown", "accessibility": "accessibility",
  // Editing and text formatting
  "bold": "bold", "italic": "italic", "underline": "underline", "strikethrough": "strikethrough", "heading": "heading", "type": "text",
  "remove-formatting": "clearFormatting", "align-left": "alignLeft", "align-center": "alignCenter", "align-right": "alignRight",
  "align-justify": "alignJustify", "list": "bulletList", "list-ordered": "numberedList", "list-checks": "checklist",
  "indent": "indent", "outdent": "outdent", "highlighter": "highlight", "palette": "palette",
  // Layout
  "layout-template": "layout", "layout-grid": "gridView", "grid-2x2": "gridView", "layout-list": "listView", "columns-2": "columns",
  "columns": "columns", "kanban": "kanban", "square-kanban": "kanban",
  // Weather and time
  "sun": "sun", "moon": "moon", "cloud-rain": "cloudRain", "snowflake": "snowflake", "timer": "timer",
  "calendar-plus": "calendarAdd", "calendar-check": "calendarCheck",
  // Maps and location
  "map-pin": "mapPin", "map": "map", "navigation": "navigate", "building": "building",
  // Brands and social
  "github": "githubLogo", "gitlab": "gitlabLogo", "linkedin": "linkedinLogo", "twitter": "xLogo", "slack": "slackLogo", "youtube": "youtubeLogo",
}) satisfies Readonly<Record<string, IconName>>;

export type LucideIconAlias = keyof typeof lucideIconAliases;

export function isLucideIconAlias(name: string): name is LucideIconAlias {
  return Object.hasOwn(lucideIconAliases, name);
}

/** Resolves a lucide kebab-case name to its Sheen semantic name, or undefined when Sheen has no equivalent intent. */
export function resolveLucideIconName(name: string): IconName | undefined {
  return isLucideIconAlias(name) ? lucideIconAliases[name] : undefined;
}
