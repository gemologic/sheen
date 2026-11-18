import { Glyph } from "./Glyph.tsx";
import type { GlyphProps } from "./Glyph.tsx";
import metadata from "./Glyph.meta.ts";

export const controls = metadata.props;
export default function GlyphDemo(props: Partial<GlyphProps>) { return <Glyph {...props} name={props.name ?? "check"} />; }
