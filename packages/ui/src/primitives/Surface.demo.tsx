import { Surface } from "./Surface.tsx";
import type { SurfaceProps } from "./Surface.tsx";
import metadata from "./Surface.meta.ts";

export const controls = metadata.props;
export default function SurfaceDemo(props: SurfaceProps) { return <Surface {...props}>{props.children ?? "Surface content"}</Surface>; }
