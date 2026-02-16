/**
 * Simple file-based locking for cross-process safety.
 * Uses mkdir atomicity for lock files (works on Windows + Unix).
 */

import { mkdirSync, rmdirSync, existsSync, statSync } from "node:fs";
import { sleep } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("infra:filelock");

export interface FileLockOptions {
  /** Max wait time in ms (default: 10000). */
  timeoutMs?: number;
  /** Poll interval in ms (default: 100). */
  pollMs?: number;
  /** Stale lock threshold in ms (default: 60000). */
  staleMs?: number;
}

/** Acquire a file lock. Returns a release function. */
export async function acquireFileLock(
  lockPath: string,
  options?: FileLockOptions,
): Promise<() => void> {
  const timeoutMs = options?.timeoutMs ?? 10_000;
  const pollMs = options?.pollMs ?? 100;
  const staleMs = options?.staleMs ?? 60_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      mkdirSync(lockPath);
      log.debug({ lockPath }, "Lock acquired");

      return () => {
        try {
          rmdirSync(lockPath);
          log.debug({ lockPath }, "Lock released");
        } catch {
          // Already removed
        }
      };
    } catch (err: unknown) {
      // Lock directory already exists — check if stale
      if (existsSync(lockPath)) {
        try {
          const stat = statSync(lockPath);
          if (Date.now() - stat.mtimeMs > staleMs) {
            log.warn({ lockPath }, "Removing stale lock");
            rmdirSync(lockPath);
            continue;
          }
        } catch {
          // Race condition, retry
        }
      }
      await sleep(pollMs);
    }
  }

  throw new Error(`Failed to acquire lock: ${lockPath} (timeout ${timeoutMs}ms)`);
}

/** Execute a function while holding a file lock. */
export async function withFileLock<T>(
  lockPath: string,
  fn: () => Promise<T>,
  options?: FileLockOptions,
): Promise<T> {
  const release = await acquireFileLock(lockPath, options);
  try {
    return await fn();
  } finally {
    release();
  }
}
