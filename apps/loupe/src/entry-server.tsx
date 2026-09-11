import { createHandler, StartServer } from "@solidjs/start/server";
import { createThemeScript } from "@gemologic/sheen/theme-script";
import { createKeyboardHydrationScript } from "@gemologic/sheen";
import plexMonoRegular from "@gemologic/sheen-tokens/fonts/IBMPlexMono-Regular.woff2?url";
import plexSansRegular from "@gemologic/sheen-tokens/fonts/IBMPlexSans-Regular.woff2?url";
import plexSansSemibold from "@gemologic/sheen-tokens/fonts/IBMPlexSans-SemiBold.woff2?url";
import { documentThemeAttributes, getThemeBootstrap } from "./theme-bootstrap";

export default createHandler(() => <StartServer document={props => {
  const bootstrap = getThemeBootstrap();
  return <html lang={bootstrap.state.locale} {...documentThemeAttributes(bootstrap)}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preload" href={plexSansRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexSansSemibold} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexMonoRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <script id="sheen-bootstrap" type="application/json" innerHTML={JSON.stringify(bootstrap).replaceAll("<", "\\u003c")} />
    {bootstrap.hydration === "client" && <script innerHTML={createThemeScript()} />}
    {props.assets}
    <script innerHTML={createKeyboardHydrationScript()} />
  </head>
  <body><div id="app">{props.children}</div>{props.scripts}</body>
</html>;
}} />);
