import { Container } from "./Layout.tsx";
import type { ContainerProps } from "./Layout.tsx";
import metadata from "./Container.meta.ts";

export const controls = metadata.props;
export default function ContainerDemo(props: ContainerProps) { return <Container {...props}>{props.children ?? <span>Content</span>}</Container>; }
