export type ReleaseStage = "development" | "prerelease" | "stable";

const semanticVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u;

export function releaseStage(version: string): ReleaseStage {
  const match = semanticVersion.exec(version);
  if (!match) throw new Error(`Invalid public package version ${JSON.stringify(version)}`);
  if (version === "0.0.0") return "development";
  return match[4] === undefined ? "stable" : "prerelease";
}

export function workspacePatchedDependencies(source: string): readonly string[] {
  const dependencies: string[] = [];
  let section = false;
  for (const line of source.split(/\r?\n/u)) {
    if (!section) {
      if (line.trim() === "patchedDependencies:") section = true;
      continue;
    }
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (/^\S/u.test(line)) break;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().replace(/^['"]|['"]$/gu, "");
    if (key) dependencies.push(key);
  }
  return Object.freeze(dependencies);
}

export function patchedDependencyReleaseError(version: string, dependencies: readonly string[]): string | undefined {
  if (releaseStage(version) !== "stable" || dependencies.length === 0) return undefined;
  return `Stable publication is blocked while workspace dependency patches remain: ${dependencies.join(", ")}. Publish a reviewed prerelease or qualify upstream/replacement implementations first.`;
}
