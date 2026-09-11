import { defineMeta } from "../metadata.ts";
import type { StepperProps } from "./Stepper.tsx";

export default defineMeta<StepperProps>({
  name: "Stepper", package: "@gemologic/sheen", category: "navigation", summary: "A responsive workflow progress list with native link, action, and status steps.",
  props: {
    ref: { description: "Native navigation landmark reference." }, label: { description: "Required navigation and progress name." }, steps: { description: "Stable-ID status, native-link, or native-button steps with one optional current step." }, orientation: { description: "Horizontal flow that stacks responsively, or an always-vertical flow.", default: "horizontal", control: { kind: "select", values: ["horizontal", "vertical"] } }, density: { description: "Default or compact spacing.", default: "default", control: { kind: "select", values: ["compact", "default"] } }, refreshing: { description: "Marks retained accepted steps busy without replacing them.", default: false },
  },
  tokens: ["--sheen-color-border-control", "--sheen-color-accent-subtle", "--sheen-color-success-subtle", "--sheen-color-danger-subtle"],
  a11y: { role: "navigation, progressbar, and ordered list", keyboard: ["Tab", "Shift+Tab", "Enter", "Space"] },
  examples: [{ title: "Workspace setup", code: '<Stepper label="Workspace setup" steps={[{ kind: "status", id: "account", label: "Account", state: "completed" }, { kind: "link", id: "team", label: "Team", state: "current", href: "/setup/team" }, { kind: "status", id: "finish", label: "Finish", state: "upcoming" }]} />' }],
  guidance: { do: ["Use link steps for URL changes and action steps only for in-place operations."], dont: ["Do not encode progress only through connector or marker color."] },
});
