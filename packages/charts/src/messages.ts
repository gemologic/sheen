export const englishChartMessages = Object.freeze({
  viewAsTable: "View as table",
  missingValue: "Missing value",
  tablePagination: "Chart data pages",
  showSeries: "Show {series}",
  hideSeries: "Hide {series}",
  zoomControls: "Chart zoom controls",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetZoom: "Reset zoom",
  keyboardInstructions: "Use Left and Right Arrow, Home, and End to inspect samples. Press Escape to clear the inspection.",
});

export type ChartMessages = Readonly<Record<keyof typeof englishChartMessages, string>>;

export function resolveChartMessages(messages: {
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
}): ChartMessages {
  return Object.freeze({
    viewAsTable: messages.chartViewAsTable ?? englishChartMessages.viewAsTable,
    missingValue: messages.chartMissingValue ?? englishChartMessages.missingValue,
    tablePagination: messages.chartTablePagination ?? englishChartMessages.tablePagination,
    showSeries: messages.chartShowSeries ?? englishChartMessages.showSeries,
    hideSeries: messages.chartHideSeries ?? englishChartMessages.hideSeries,
    zoomControls: messages.chartZoomControls ?? englishChartMessages.zoomControls,
    zoomIn: messages.chartZoomIn ?? englishChartMessages.zoomIn,
    zoomOut: messages.chartZoomOut ?? englishChartMessages.zoomOut,
    resetZoom: messages.chartResetZoom ?? englishChartMessages.resetZoom,
    keyboardInstructions: messages.chartKeyboardInstructions ?? englishChartMessages.keyboardInstructions,
  });
}

export function formatChartMessage(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{([^}]+)\}/gu, (match, key: string) => values[key] ?? match);
}
