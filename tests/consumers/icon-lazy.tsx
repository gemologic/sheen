import { LazyIcon } from "@gemologic/sheen-icons/lazy";
import { resolveLucideIconName } from "@gemologic/sheen-icons/lucide";

export function LazyIconConsumer(props: { readonly name: string }) {
  return <LazyIcon name={resolveLucideIconName(props.name) ?? props.name} />;
}
