import { Toaster } from "./Toaster.tsx";
import type { ToasterProps } from "./Toaster.tsx";
import metadata from "./Toaster.meta.ts";
export const controls = metadata.props;
export default function ToasterDemo(props: ToasterProps) { return <Toaster {...props} />; }
