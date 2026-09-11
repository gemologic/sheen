import { expect, test } from "vitest";
import { renderToString } from "solid-js/web";
import { useIsWindowFocused, useOnlineStatus } from "./browser-status.ts";

test("browser status is unknown on the server without browser globals", () => {
  function Status() {
    const online = useOnlineStatus();
    const focused = useIsWindowFocused();
    return <output>{`${String(online())}/${String(focused())}`}</output>;
  }
  expect(renderToString(() => <Status />)).toContain("undefined/undefined");
});
