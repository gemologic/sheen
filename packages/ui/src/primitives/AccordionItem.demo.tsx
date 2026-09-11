import { Accordion, AccordionItem } from "./Accordion.tsx";
import type { AccordionItemProps } from "./Accordion.tsx";
import metadata from "./AccordionItem.meta.ts";
export const controls = metadata.props;
export default function AccordionItemDemo(props: AccordionItemProps) { return <Accordion><AccordionItem {...props} /></Accordion>; }
