import { ThemeScope } from "./ThemeProvider.tsx";
import type { ThemeScopeProps } from "./ThemeProvider.tsx";
import { Button } from "../primitives/Button.tsx";
import metadata from "./ThemeScope.meta.ts";

export const controls = metadata.props;
export default function ThemeScopeDemo(props: ThemeScopeProps) { return <ThemeScope {...props}><Button>Scope preview</Button></ThemeScope>; }
