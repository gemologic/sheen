import { access, cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../dist/skill", import.meta.url));
const target = fileURLToPath(new URL("../packages/cli/dist/skill", import.meta.url));
for (const file of ["SKILL.md", "llms.txt"]) await access(new URL(file, new URL("../dist/skill/", import.meta.url)));
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true, errorOnExist: true });
console.log("Bundled generated Sheen skill in @gemologic/sheen-cli");
