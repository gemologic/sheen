import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ShortcutProvider, ThemeProvider } from "@gemologic/sheen";
import { DeskShell } from "./desk.tsx";
import "./app.css";

export default function App() {
  return <Router root={props => <MetaProvider><ThemeProvider hydration="client" defaultMode="dark">
    <ShortcutProvider development={import.meta.env.DEV}><DeskShell><Suspense>{props.children}</Suspense></DeskShell></ShortcutProvider>
  </ThemeProvider></MetaProvider>}><FileRoutes /></Router>;
}
