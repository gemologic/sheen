import { Hero } from "./Hero.tsx";
import type { HeroProps } from "./Hero.tsx";
import metadata from "./Hero.meta.ts";

export const controls = metadata.props;
export default function HeroDemo(props: HeroProps) { return <Hero {...props} />; }
