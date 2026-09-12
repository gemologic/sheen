import { lazy, Suspense } from "solid-js";
import { ThemeProvider } from "@gemologic/sheen";

const Route = lazy(() => import("./ui-hydration-route.tsx"));

export function Application() {
  return <ThemeProvider><main onPointerDown={() => {}}><Suspense><Route /></Suspense></main></ThemeProvider>;
}
