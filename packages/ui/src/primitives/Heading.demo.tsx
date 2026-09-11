import { Heading } from "./Typography.tsx";
import type { HeadingProps } from "./Typography.tsx";
import metadata from "./Heading.meta.ts";

export const controls = metadata.props;
export default function HeadingDemo(props: HeadingProps = { level: 2 }) { return <Heading {...props}>{props.children ?? "Workspace settings"}</Heading>; }
