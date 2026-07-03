// Copies the static web game into www/ for Capacitor to package.
import { rm, mkdir, cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const wwwDir = path.join(rootDir, "www");

const filesToCopy = ["index.html", "src", "styles", "hero_progression_matrix.json"];

await rm(wwwDir, { recursive: true, force: true });
await mkdir(wwwDir, { recursive: true });

for (const entry of filesToCopy) {
  await cp(path.join(rootDir, entry), path.join(wwwDir, entry), { recursive: true });
}

console.log(`Copied ${filesToCopy.join(", ")} -> ${path.relative(rootDir, wwwDir)}`);
