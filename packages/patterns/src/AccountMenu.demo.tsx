import { AccountMenu } from "./AccountMenu.tsx";
import type { AccountMenuProps } from "./AccountMenu.tsx";
import metadata from "./AccountMenu.meta.ts";
export const controls = metadata.props;
export default function AccountMenuDemo(props: AccountMenuProps) { return <AccountMenu {...props} />; }
