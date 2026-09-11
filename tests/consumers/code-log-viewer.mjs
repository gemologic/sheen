import { createComponent } from "solid-js";
import { LogViewer } from "@gemologic/sheen-code/log-viewer";
import "@gemologic/sheen-code/styles.css";

export function ConsumerLogViewer() {
  return createComponent(LogViewer, { entries: [{ id: "one", timestamp: "2026-09-09T12:00:00Z", level: "info", message: "Ready" }], label: "Installed logs" });
}
