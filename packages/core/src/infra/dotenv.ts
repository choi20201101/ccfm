/**
 * Lightweight .env file loader.
 * Reads key=value pairs and sets them on process.env if not already set.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getLogger } from "../logging/logger.js";

const log = getLogger("infra:dotenv");

/** Load .env file from specified path (or cwd/.env). */
export function loadDotenv(envPath?: string): void {
  const filePath = envPath ?? join(process.cwd(), ".env");

  if (!existsSync(filePath)) {
    log.debug({ path: filePath }, ".env file not found, skipping");
    return;
  }

  const content = readFileSync(filePath, "utf-8");
  let loaded = 0;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Only set if not already defined (env vars take precedence)
    if (process.env[key] === undefined) {
      process.env[key] = value;
      loaded++;
    }
  }

  log.debug({ path: filePath, loaded }, "Loaded .env variables");
}
