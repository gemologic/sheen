import { defineMeta } from "@gemologic/sheen/metadata";
import type { LoadingStateProps } from "./LoadingState.tsx";
export default defineMeta<LoadingStateProps>({
  name: "LoadingState", package: "@gemologic/sheen-patterns", category: "application", summary: "Layout-reserving cold skeletons and delayed refresh progress without remounting content.",
  props: {
    label: { description: "Required nonempty accessible region name." },
    phase: { description: "Explicit app-owned idle/cold/refresh phase. Cold hides content; refresh preserves it. Timers begin after hydration or a phase change." },
    fallback: { description: "Required noninteractive skeleton matching the app's layout. Cold load reserves its size immediately and reveals it after 200ms." },
  },
  tokens: ["--sheen-color-accent", "--sheen-duration-slow"],
  a11y: { role: "region, progressbar", keyboard: ["Tab", "Shift+Tab"] },
  examples: [{ title: "Refreshing existing content", imports: 'import { Skeleton } from "@gemologic/sheen";', code: '<LoadingState label="Orders" phase="refresh" fallback={<Skeleton shape="rectangle" style={{ height: "12rem" }} />}><p>Existing orders</p></LoadingState>' }],
  guidance: { do: ["Keep the same component mounted while refreshing.", "Supply a layout-matched skeleton and app-owned phase.", "Handle errors and accepted data in the app."], dont: ["Do not use cold phase for ordinary revalidation.", "Do not retain unauthorized data after an account or permission boundary.", "Do not put interactive controls in the fallback."] },
});
