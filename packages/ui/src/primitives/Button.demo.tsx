import { Button } from "./Button.tsx";
import type { ButtonProps } from "./Button.tsx";
import metadata from "./Button.meta.ts";

export const controls = metadata.props;
export default function ButtonDemo(props: ButtonProps) { return <Button {...props}>{props.children ?? "Save changes"}</Button>; }
