/**
 * JSON5 file I/O for configuration files.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import JSON5 from "json5";
import { ensureDir } from "./paths.js";
import { dirname } from "node:path";

/** Read and parse a JSON5 file. Returns undefined if file doesn't exist. */
export function readJson5File<T = unknown>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;

  const raw = readFileSync(filePath, "utf-8");
  return JSON5.parse(raw) as T;
}

/** Write a value as formatted JSON5 to a file. Creates parent dirs if needed. */
export function writeJson5File(filePath: string, data: unknown): void {
  ensureDir(dirname(filePath));
  const content = JSON5.stringify(data, { space: 2, quote: "'" });
  writeFileSync(filePath, content, "utf-8");
}

/** Read and parse a plain JSON file. Returns undefined if file doesn't exist. */
export function readJsonFile<T = unknown>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;

  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

/** Write a value as formatted JSON to a file. Creates parent dirs if needed. */
export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDir(dirname(filePath));
  const content = JSON.stringify(data, null, 2);
  writeFileSync(filePath, content, "utf-8");
}
