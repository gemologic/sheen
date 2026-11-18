import { StreamingText } from "./StreamingText.tsx";
import type { StreamingTextProps } from "./StreamingText.tsx";
import metadata from "./StreamingText.meta.ts";

export const controls = metadata.props;
export default function StreamingTextDemo(props: Partial<StreamingTextProps>) { return <StreamingText {...props} text={props.text ?? "Checking the deploy log.\n\nThe billing worker was rolled back"} />; }
