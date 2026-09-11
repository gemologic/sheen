export const englishMessages = Object.freeze({
  close: "Close", cancel: "Cancel", confirm: "Confirm", retry: "Retry", remove: "Remove", breadcrumb: "Breadcrumb",
  loading: "Loading", notifications: "Notifications", noNotifications: "No notifications", unread: "Unread", markAllNotificationsRead: "Mark all read", noResults: "No results", empty: "Nothing here yet", selectOption: "Select an option",
  avatarOverflow: "{count} more",
  nextPage: "Next page", previousPage: "Previous page", firstPage: "First page", lastPage: "Last page",
  pagination: "Pagination", pageLabel: "Page {page}", pageStatus: "Page {page} of {pages}", clearSearch: "Clear search",
  statusBar: "Application status", connected: "Connected", connecting: "Connecting", disconnected: "Disconnected", degraded: "Degraded connection", unknownConnection: "Connection unknown", backgroundTasks: "Background tasks",
  notFound: "Not found", serverError: "Something went wrong", permissionDenied: "Permission denied", retrying: "Retrying", retryFailed: "Retry failed. Try again.",
  moreActions: "More actions", pendingShortcut: "Pending shortcut", shortcutHelp: "Keyboard shortcuts", shortcutGroup: "Application",
  commandPalette: "Command palette", openCommandPalette: "Open command palette", searchCommands: "Search commands", commandResults: "Command results", recentCommands: "Recent", refreshingCommands: "Refreshing commands", commandSourceFailed: "Commands could not be refreshed.",
  cycleThemeMode: "Cycle theme mode", toggleSidebar: "Toggle sidebar", sidebar: "Sidebar",
  savedViews: "Saved views", selectView: "Select a saved view", viewName: "View name", saveView: "Save view", saveCurrentView: "Save current view", manageSavedViews: "Manage saved views", noSavedViews: "No saved views yet.", renameView: "Rename view", restoreView: "Restore view", deleteView: "Delete view", deleteSavedViewTitle: "Delete saved view?", deleteSavedViewDescription: "Delete {name}? This cannot be undone.", retryViewOperation: "Retry view operation",
  settingsSections: "Settings sections", settingsSaveBar: "Settings save bar", saveChanges: "Save changes", savingChanges: "Saving changes", unsavedChanges: "Unsaved changes", saveFailed: "Save failed. Your changes were retained.",
  editableUpdateFailed: "Update failed. Your draft was retained.",
  tagValues: "Tags", tagAdded: "Added {value}", tagRemoved: "Removed {value}", tagMoved: "Moved {value}", tagDuplicate: "{value} is already added.", tagValidating: "Validating tag", tagValidationFailed: "Tag validation failed. Your draft was retained.", tagReorderInstructions: "Press Delete to remove. Hold Alt and press an arrow key, Home, or End to reorder.",
  chooseFiles: "Choose files", dropFilesHere: "Drop files here", fileDropHint: "Drag files here or choose from this device.", selectedFiles: "Selected files", fileCountRejected: "Only {count} more files can be added.", fileTooLarge: "{name} exceeds the {size} limit.", fileTypeRejected: "{name} is not an accepted file type.", uploadProgress: "Upload progress for {name}",
  workflowCompleted: "Completed", workflowCurrent: "Current", workflowUpcoming: "Upcoming", workflowError: "Error", stepperProgress: "{label} progress",
  increaseValue: "Increase {label}", decreaseValue: "Decrease {label}", minimumValue: "Minimum {label}", maximumValue: "Maximum {label}",
  expandTreeItem: "Expand {label}", collapseTreeItem: "Collapse {label}",
  shortcutInventory: "All registered shortcuts. Availability depends on the active scope.", shortcutShadowed: "Replaced by a newer binding", shortcutDisabled: "Character shortcut disabled",
  unsavedTitle: "Discard unsaved changes?", unsavedDescription: "Your unsaved changes will be lost if you leave this page.", discardChanges: "Discard changes", navigationFailed: "Navigation failed. Your changes have been retained.",
});

/** Optional message families supplied by packages layered on the UI provider. */
export interface ExtensionMessages {
  readonly copyCode?: string;
  readonly codeCopied?: string;
  readonly codeCopyFailed?: string;
  readonly wrapCode?: string;
  readonly stopWrappingCode?: string;
  readonly codeHighlightedLines?: string;
  readonly viewerSearch?: string;
  readonly viewerCopy?: string;
  readonly viewerCopied?: string;
  readonly viewerCopyFailed?: string;
  readonly viewerMatches?: string;
  readonly searchTable?: string;
  readonly tableShortcuts?: string;
  readonly refreshing?: string;
  readonly previousResults?: string;
  readonly clearFilters?: string;
  readonly clearSearchAndFilters?: string;
  readonly selectAll?: string;
  readonly selectPage?: string;
  readonly selectRow?: string;
  readonly clearSelection?: string;
  readonly selectionActions?: string;
  readonly selectedCount?: string;
  readonly cardView?: string;
  readonly rowActions?: string;
  readonly sort?: string;
  readonly sortColumn?: string;
  readonly sortedAscending?: string;
  readonly sortedDescending?: string;
  readonly notSorted?: string;
  readonly sortPriority?: string;
  readonly export?: string;
  readonly exportCSV?: string;
  readonly exportJSON?: string;
  readonly preparingExport?: string;
  readonly exportFailed?: string;
  readonly retryExport?: string;
  readonly downloadLastExport?: string;
  readonly filters?: string;
  readonly filterAdd?: string;
  readonly filterColumns?: string;
  readonly filterSearchColumns?: string;
  readonly filterEdit?: string;
  readonly filterRemove?: string;
  readonly filterApply?: string;
  readonly filterOperator?: string;
  readonly filterValue?: string;
  readonly filterMinimum?: string;
  readonly filterMaximum?: string;
  readonly filterDate?: string;
  readonly filterStartDate?: string;
  readonly filterEndDate?: string;
  readonly filterValues?: string;
  readonly filterCaseSensitive?: string;
  readonly filterNegated?: string;
  readonly filterInheritedNegation?: string;
  readonly filterInvalid?: string;
  readonly filterEquals?: string;
  readonly filterContains?: string;
  readonly filterStartsWith?: string;
  readonly filterEndsWith?: string;
  readonly filterLessThan?: string;
  readonly filterAtMost?: string;
  readonly filterGreaterThan?: string;
  readonly filterAtLeast?: string;
  readonly filterBetween?: string;
  readonly filterIsEmpty?: string;
  readonly filterIsAnyOf?: string;
  readonly filterSummary?: string;
  readonly filterNot?: string;
  readonly filterInheritedNot?: string;
  readonly queryBuilder?: string;
  readonly queryGroup?: string;
  readonly queryRule?: string;
  readonly queryMatch?: string;
  readonly queryMatchAll?: string;
  readonly queryMatchAny?: string;
  readonly queryColumn?: string;
  readonly queryAddRule?: string;
  readonly queryAddGroup?: string;
  readonly queryNegate?: string;
  readonly queryRemoveNegation?: string;
  readonly queryRemove?: string;
  readonly queryMoveBefore?: string;
  readonly queryMoveAfter?: string;
  readonly queryChanged?: string;
  readonly groupMissing?: string;
  readonly loadingChildren?: string;
  readonly columns?: string;
  readonly showColumn?: string;
  readonly moveColumnStart?: string;
  readonly moveColumnEnd?: string;
  readonly pinColumn?: string;
  readonly pinNone?: string;
  readonly pinStart?: string;
  readonly pinEnd?: string;
  readonly autoFitColumn?: string;
  readonly resetColumnWidth?: string;
  readonly reorderColumn?: string;
  readonly resizeColumn?: string;
  readonly columnWidthPixels?: string;
  readonly editCell?: string;
  readonly cellValueRequired?: string;
  readonly cellValueInvalid?: string;
  readonly noValue?: string;
  readonly cellUpdateFailed?: string;
  readonly cellUpdateFailedDescription?: string;
  readonly cellConflict?: string;
  readonly tableControls?: string;
  readonly resultCountOne?: string;
  readonly resultCount?: string;
  readonly expand?: string;
  readonly collapse?: string;
  readonly chartViewAsTable?: string;
  readonly chartMissingValue?: string;
  readonly chartTablePagination?: string;
  readonly chartShowSeries?: string;
  readonly chartHideSeries?: string;
  readonly chartZoomControls?: string;
  readonly chartZoomIn?: string;
  readonly chartZoomOut?: string;
  readonly chartResetZoom?: string;
  readonly chartKeyboardInstructions?: string;
}

type CoreMessages = Readonly<Record<keyof typeof englishMessages, string>>;
export type Messages = CoreMessages & ExtensionMessages;

export function resolveMessages(parent: Messages, overrides: Partial<Messages> = {}): Messages {
  for (const value of Object.values(overrides)) if (typeof value !== "string") throw new Error("Sheen message overrides must be strings");
  return Object.freeze({ ...parent, ...overrides });
}
