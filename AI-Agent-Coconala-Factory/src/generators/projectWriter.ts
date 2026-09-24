import fs from "node:fs";
import path from "node:path";
import { readJson, writeFile } from "../lib/fsx";

/**
 * Writes one client project directory, safely.
 *
 * - Never touches anything outside `projectDir`.
 * - Refuses a directory that exists but is not a factory project (no
 *   project.json), or that belongs to a different slug.
 * - Refuses to overwrite an existing project unless `force` is set. With
 *   `force`, it rewrites only files it generated and deletes only files
 *   that the previous generation created and this one no longer does.
 *   Hand-added files (notes, deployment history, …) are never touched.
 */
export class ProjectWriteError extends Error {}

export function writeProject(
  projectDir: string,
  slug: string,
  files: Record<string, string>,
  options: { force: boolean },
  binaries: Record<string, Uint8Array> = {},
): { written: string[]; removed: string[] } {
  const manifestFile = path.join(projectDir, "project.json");
  let previous: string[] = [];
  if (fs.existsSync(projectDir) && fs.readdirSync(projectDir).length > 0) {
    if (!fs.existsSync(manifestFile)) {
      throw new ProjectWriteError(`${projectDir} exists and is not a factory project (no project.json). Refusing to write.`);
    }
    const existing = readJson<{ slug?: string; generatedFiles?: string[]; createdOn?: string }>(manifestFile);
    if (existing.slug !== slug) {
      throw new ProjectWriteError(`${projectDir} belongs to project "${existing.slug}", not "${slug}". Refusing to write.`);
    }
    if (!options.force) {
      throw new ProjectWriteError(`${projectDir} already exists. Use --force to regenerate its generated files.`);
    }
    previous = existing.generatedFiles ?? [];
  }

  const root = path.resolve(projectDir);
  const inside = (rel: string) => {
    const target = path.resolve(root, rel);
    if (!target.startsWith(root + path.sep)) throw new ProjectWriteError(`refusing to write outside the project: ${rel}`);
    return target;
  };

  const removed: string[] = [];
  for (const rel of previous) {
    if (!(rel in files) && !(rel in binaries) && fs.existsSync(inside(rel))) {
      fs.rmSync(inside(rel));
      removed.push(rel);
    }
  }
  for (const [rel, content] of Object.entries(files)) writeFile(inside(rel), content);
  for (const [rel, content] of Object.entries(binaries)) writeFile(inside(rel), content);
  return { written: [...Object.keys(files), ...Object.keys(binaries)].sort(), removed };
}

/** Keeps createdOn stable across regenerations. */
export function existingCreatedOn(projectDir: string): string | undefined {
  const file = path.join(projectDir, "project.json");
  return fs.existsSync(file) ? readJson<{ createdOn?: string }>(file).createdOn : undefined;
}
