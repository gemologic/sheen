import type { JSX } from "solid-js";
import { ModalFrame } from "./Dialog.tsx";
import type { DialogProps } from "./Dialog.tsx";
import { cn } from "../utils/cn.ts";

export type DrawerSide = "start" | "end";

export interface DrawerProps extends DialogProps {
  side?: DrawerSide;
}

function panelClass(kind: "drawer" | "sheet", props: DrawerProps): string {
  const side = props.side ?? "end";
  if (side !== "start" && side !== "end") throw new Error(`${kind} side must be start or end`);
  return cn("sheen-drawer", `sheen-drawer-${side}`, `sheen-${kind}`, props.class);
}

export function Drawer(props: DrawerProps): JSX.Element {
  return <ModalFrame {...props} class={panelClass("drawer", props)} />;
}

export type SheetProps = DrawerProps;

export function Sheet(props: SheetProps): JSX.Element {
  return <ModalFrame {...props} class={panelClass("sheet", props)} />;
}
