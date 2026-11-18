import { MetaProvider } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { ThemeProvider } from "@gemologic/sheen";
import { Console } from "./console.tsx";
import "./app.css";

/** The shell lives in the router root so route changes never remount AdminApp. */
export default function App() {
  return <Router root={props => <MetaProvider><ThemeProvider hydration="client" defaultMode="dark">
    <Console><Suspense>{props.children}</Suspense></Console>
  </ThemeProvider></MetaProvider>}><FileRoutes /></Router>;
}
