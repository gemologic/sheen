import { SearchInput } from "./SearchInput.tsx";
import type { SearchInputProps } from "./SearchInput.tsx";
import metadata from "./SearchInput.meta.ts";

export const controls = metadata.props;
export default function SearchInputDemo(props: SearchInputProps) { return <SearchInput {...props} />; }
