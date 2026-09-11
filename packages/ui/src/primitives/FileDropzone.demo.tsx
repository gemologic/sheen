import { FileDropzone } from "./FileDropzone.tsx";
import type { FileDropzoneProps } from "./FileDropzone.tsx";
import metadata from "./FileDropzone.meta.ts";

export const controls = metadata.props;
export default function FileDropzoneDemo(props: FileDropzoneProps = { label: "Documents", accept: ".pdf,text/plain", multiple: true, items: [], onFilesSelected: () => {} }) { return <FileDropzone {...props} />; }
