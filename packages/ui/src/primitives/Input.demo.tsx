import { Input } from "./Input.tsx";
import type { InputProps } from "./Input.tsx";
import metadata from "./Input.meta.ts";

export const controls = metadata.props;
export default function InputDemo(props: InputProps = { label: "Workspace name" }) { return <Input {...props} />; }
