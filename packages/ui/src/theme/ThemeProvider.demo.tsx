import { ThemeProvider } from "./ThemeProvider.tsx";
import type { ThemeProviderProps } from "./ThemeProvider.tsx";
import { Button } from "../primitives/Button.tsx";
import metadata from "./ThemeProvider.meta.ts";

export const controls = metadata.props;
/** Provider demos belong in an isolated document because the provider owns html attributes. */
export default function ThemeProviderDemo(props: ThemeProviderProps) { return <ThemeProvider {...props}><Button>Provider preview</Button></ThemeProvider>; }
