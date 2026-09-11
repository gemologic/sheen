import { Card } from "./Surface.tsx";
import type { CardProps } from "./Surface.tsx";
import metadata from "./Card.meta.ts";

export const controls = metadata.props;
export default function CardDemo(props: CardProps) { return <Card {...props}>{props.children ?? "Surface content"}</Card>; }
