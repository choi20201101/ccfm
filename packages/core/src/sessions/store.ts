/**
 * JSONL-based session transcript storage.
 * Stores and retrieves session entries as newline-delimited JSON.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { SessionEntry } from "@ccfm/shared";
import { resolveSessionDir, ensureDir } from "../config/paths.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("sessions:store");

export class SessionStore {
  private readonly dir: string;

  constructor(customPath?: string) {
    this.dir = resolveSessionDir(customPath);
    ensureDir(this.dir);
    log.debug({ dir: this.dir }, "SessionStore initialized");
  }

  /** Resolve the JSONL file path for a given session key. */
  private filePath(sessionKey: string): string {
    return join(this.dir, `${sessionKey}.jsonl`);
  }

  /** Append a JSON entry to the session file. */
  save(sessionKey: string, entry: SessionEntry): void {
    const file = this.filePath(sessionKey);
    const line = JSON.stringify(entry) + "\n";
    writeFileSync(file, line, { flag: "a" });
    log.debug({ sessionKey }, "Saved session entry");
  }

  /** Load all entries from a session JSONL file. */
  load(sessionKey: string): SessionEntry[] {
    const file = this.filePath(sessionKey);
    if (!existsSync(file)) {
      log.debug({ sessionKey }, "Session file not found");
      return [];
    }

    const raw = readFileSync(file, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim().length > 0);
    const entries: SessionEntry[] = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as SessionEntry);
      } catch (err) {
        log.warn({ sessionKey, line }, "Skipping malformed JSONL line");
      }
    }

    return entries;
  }

  /** List all session keys in the storage directory. */
  list(): string[] {
    if (!existsSync(this.dir)) {
      return [];
    }

    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.replace(/\.jsonl$/, ""));
  }

  /** Delete a session file. */
  delete(sessionKey: string): boolean {
    const file = this.filePath(sessionKey);
    if (!existsSync(file)) {
      log.debug({ sessionKey }, "Session file not found for deletion");
      return false;
    }

    unlinkSync(file);
    log.info({ sessionKey }, "Session file deleted");
    return true;
  }
}
