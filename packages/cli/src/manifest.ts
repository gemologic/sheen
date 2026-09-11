import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export async function runManifest(root: string): Promise<string> {
  try {
    const result = await run("pnpm", ["manifest"], { cwd: root, timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
    return `${result.stdout}${result.stderr}`;
  } catch (error) {
    if (error instanceof Error && "stdout" in error && "stderr" in error) {
      const stdout = typeof error.stdout === "string" ? error.stdout : "";
      const stderr = typeof error.stderr === "string" ? error.stderr : "";
      throw new Error(`Manifest generation failed in ${root}\n${stdout}${stderr}`.trimEnd(), { cause: error });
    }
    throw error;
  }
}
