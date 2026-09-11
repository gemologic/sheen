import { SettingsLayout } from "./SettingsLayout.tsx";
import type { SettingsLayoutProps } from "./SettingsLayout.tsx";
import metadata from "./SettingsLayout.meta.ts";

export const controls = metadata.props;

export default function SettingsLayoutDemo(props: SettingsLayoutProps) {
  return <SettingsLayout {...props} />;
}
