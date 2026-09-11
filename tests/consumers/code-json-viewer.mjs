import { createComponent } from "solid-js";
import { JSONViewer } from "@gemologic/sheen-code/json-viewer";
import "@gemologic/sheen-code/styles.css";

export function ConsumerJSONViewer() {
  return createComponent(JSONViewer, { value: { ready: true }, label: "Installed JSON" });
}
