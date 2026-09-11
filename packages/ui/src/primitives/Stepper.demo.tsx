import { Stepper } from "./Stepper.tsx";
import type { StepperProps } from "./Stepper.tsx";
import metadata from "./Stepper.meta.ts";

export const controls = metadata.props;
export default function StepperDemo(props: StepperProps = { label: "Workspace setup", steps: [{ kind: "status", id: "account", label: "Account", state: "completed" }, { kind: "link", id: "team", label: "Team", state: "current", href: "/setup/team" }, { kind: "status", id: "finish", label: "Finish", state: "upcoming" }] }) { return <Stepper {...props} />; }
