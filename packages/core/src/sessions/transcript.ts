/**
 * Transcript read/write operations using JSONL format.
 * Each transcript entry is appended as a single JSON line.
 */

import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { TranscriptEntry } from "@ccfm/shared";
import { resolveSessionDir, ensureDir } from "../config/paths.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("sessions:transcript");

/** Resolve the transcript file path for a session. */
function transcriptPath(sessionKey: string): string {
  const dir = resolveSessionDir();
  ensureDir(dir);
  return join(dir, `${sessionKey}.transcript.jsonl`);
}

/** Append a single transcript entry to the session's transcript file. */
export function appendTranscript(
  sessionKey: string,
  entry: TranscriptEntry,
): void {
  const file = transcriptPath(sessionKey);
  const line = JSON.stringify(entry) + "\n";
  appendFileSync(file, line, "utf-8");
  log.debug({ sessionKey, role: entry.role }, "Transcript entry appended");
}

/** Read all transcript entries for a session. Returns empty array if none exist. */
export function readTranscript(sessionKey: string): TranscriptEntry[] {
  const file = transcriptPath(sessionKey);
  if (!existsSync(file)) {
    log.debug({ sessionKey }, "No transcript file found");
    return [];
  }

  const raw = readFileSync(file, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const entries: TranscriptEntry[] = [];

  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as TranscriptEntry);
    } catch (err) {
      log.warn({ sessionKey, line }, "Skipping malformed transcript line");
    }
  }

  log.debug({ sessionKey, count: entries.length }, "Transcript loaded");
  return entries;
}
