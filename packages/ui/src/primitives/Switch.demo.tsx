import { Switch } from "./Switch.tsx";
import type { SwitchProps } from "./Switch.tsx";
import metadata from "./Switch.meta.ts";

export const controls = metadata.props;
export default function SwitchDemo(props: SwitchProps = { label: "Live updates" }) { return <Switch {...props} />; }
