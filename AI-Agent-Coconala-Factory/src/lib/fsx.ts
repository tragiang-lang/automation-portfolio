import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Factory root (the directory holding package.json). */
export const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CORE_ASSETS_DIR = path.join(FACTORY_ROOT, "core-assets");
export const PROJECTS_DIR = path.join(FACTORY_ROOT, "projects");

export function readJson<T = unknown>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

/** Stable JSON: 2-space indent, LF, trailing newline, so regeneration diffs stay clean. */
export function toStableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.replace(/\r\n/g, "\n"));
}

/** Recursive file list (posix-style paths relative to `dir`), skipping `skipDirs` names. */
export function listFiles(dir: string, skipDirs: readonly string[] = ["node_modules", "build", ".git"]): string[] {
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!skipDirs.includes(entry.name)) walk(path.join(current, entry.name));
      } else {
        out.push(path.relative(dir, path.join(current, entry.name)).split(path.sep).join("/"));
      }
    }
  };
  if (fs.existsSync(dir)) walk(dir);
  return out.sort();
}

/** sha256 over LF-normalized text, so a CRLF checkout on Windows hashes the same as LF. */
export function hashText(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

export function hashFile(file: string): string {
  return hashText(fs.readFileSync(file, "utf8"));
}

export function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}
