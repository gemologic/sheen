import { Faq } from "./Faq.tsx";
import type { FaqProps } from "./Faq.tsx";
import metadata from "./Faq.meta.ts";

export const controls = metadata.props;
export default function FaqDemo(props: FaqProps) { return <Faq {...props} />; }
