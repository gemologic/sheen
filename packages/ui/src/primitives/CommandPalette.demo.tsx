import { CommandPalette } from "./CommandPalette.tsx";
import type { CommandPaletteProps } from "./CommandPalette.tsx";
import metadata from "./CommandPalette.meta.ts";

export const controls = metadata.props;
export default function CommandPaletteDemo(props: CommandPaletteProps) { return <CommandPalette {...props} />; }
