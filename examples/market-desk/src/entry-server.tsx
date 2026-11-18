import { createHandler, StartServer } from "@solidjs/start/server";
import { createKeyboardHydrationScript } from "@gemologic/sheen";
import { createThemeScript } from "@gemologic/sheen/theme-script";
import plexMonoRegular from "@gemologic/sheen-tokens/fonts/IBMPlexMono-Regular.woff2?url";
import plexSansRegular from "@gemologic/sheen-tokens/fonts/IBMPlexSans-Regular.woff2?url";
import plexSansSemibold from "@gemologic/sheen-tokens/fonts/IBMPlexSans-SemiBold.woff2?url";
import { bootstrap, serializeBootstrap } from "./bootstrap.ts";

export default createHandler(() => <StartServer document={props => <html lang="en-US">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preload" href={plexSansRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexSansSemibold} as="font" type="font/woff2" crossorigin="anonymous" />
    <link rel="preload" href={plexMonoRegular} as="font" type="font/woff2" crossorigin="anonymous" />
    <script innerHTML={createThemeScript()} />
    <script id="market-bootstrap" type="application/json" innerHTML={serializeBootstrap(bootstrap())} />
    {props.assets}
    <script innerHTML={createKeyboardHydrationScript()} />
  </head>
  <body><div id="app">{props.children}</div>{props.scripts}</body>
</html>} />);
