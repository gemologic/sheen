import { createComponent } from "solid-js";
import { DiffViewer } from "@gemologic/sheen-code/diff-viewer";
import "@gemologic/sheen-code/styles.css";

export function ConsumerDiffViewer() {
  return createComponent(DiffViewer, { oldText: "before", newText: "after", label: "Installed diff" });
}
