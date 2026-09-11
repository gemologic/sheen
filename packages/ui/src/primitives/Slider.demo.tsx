import { Slider } from "./Slider.tsx";
import type { SliderProps } from "./Slider.tsx";
import metadata from "./Slider.meta.ts";

export const controls = metadata.props;
export default function SliderDemo(props: SliderProps = { label: "Alert threshold", defaultValue: 75 }) { return <Slider {...props} />; }
