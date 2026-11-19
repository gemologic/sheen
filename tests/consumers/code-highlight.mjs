import { highlightCode } from "@gemologic/sheen-code/highlight";
import { typescript } from "@gemologic/sheen-code/languages";

export const highlighted = highlightCode({ code: "const ready = true;", language: "ts", languages: [typescript] });
