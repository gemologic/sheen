import { Button } from "./Button.tsx";
import { ButtonGroup } from "./ButtonGroup.tsx";
import type { ButtonGroupProps } from "./ButtonGroup.tsx";
import metadata from "./ButtonGroup.meta.ts";

export const controls = metadata.props;
export default function ButtonGroupDemo(props: ButtonGroupProps) {
  return <ButtonGroup {...props}>{props.children ?? <><Button>Save</Button><Button>Discard</Button></>}</ButtonGroup>;
}
