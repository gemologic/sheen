import { access, cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../dist/skill", import.meta.url));
const target = fileURLToPath(new URL("../packages/cli/dist/skill", import.meta.url));
for (const file of ["SKILL.md", "llms.txt"]) await access(new URL(file, new URL("../dist/skill/", import.meta.url)));
await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true, errorOnExist: true });
const patchSource = fileURLToPath(new URL("../patches", import.meta.url));
const patchTarget = fileURLToPath(new URL("../packages/cli/dist/app-patches", import.meta.url));
const patches = ["solid-js@1.9.15.patch", "@kobalte__core@0.13.13.patch", "@kobalte__utils@0.9.2.patch"];
await rm(patchTarget, { recursive: true, force: true });
await mkdir(patchTarget, { recursive: true });
for (const patch of patches) {
  await access(new URL(patch, new URL("../patches/", import.meta.url)));
  await cp(`${patchSource}/${patch}`, `${patchTarget}/${patch}`, { errorOnExist: true });
}
console.log("Bundled generated Sheen skill and qualified application patches in @gemologic/sheen-cli");
