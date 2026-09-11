import { FilterBar } from "./FilterBar.tsx";
import type { FilterBarProps } from "./FilterBar.tsx";
import metadata from "./FilterBar.meta.ts";

interface DemoRow { readonly id: string; readonly name: string; readonly status: string }

export const controls = metadata.props;
export default function FilterBarDemo(props: FilterBarProps<DemoRow>) {
  return <FilterBar {...props} />;
}

