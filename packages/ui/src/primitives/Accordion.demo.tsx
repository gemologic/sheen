import { Accordion } from "./Accordion.tsx";
import type { AccordionProps } from "./Accordion.tsx";
import metadata from "./Accordion.meta.ts";
export const controls = metadata.props;
export default function AccordionDemo(props: AccordionProps) { return <Accordion {...props} />; }
