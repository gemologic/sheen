import { RangeSlider } from "./Slider.tsx";
import type { RangeSliderProps } from "./Slider.tsx";
import metadata from "./RangeSlider.meta.ts";

export const controls = metadata.props;
export default function RangeSliderDemo(props: RangeSliderProps = { label: "Latency window", defaultValue: [20, 80], minStepsBetweenThumbs: 5 }) { return <RangeSlider {...props} />; }
