import { DynamicIcon } from "@gemologic/sheen-icons";

export function DynamicIconConsumer(props: { readonly name: string }) {
  return <DynamicIcon name={props.name} />;
}
