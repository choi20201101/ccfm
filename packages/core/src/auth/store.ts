/**
 * File-based auth profile store with CRUD operations.
 * Persists profiles to disk using JSON with file locking for safety.
 */

import type {
  AuthProfileStore,
  AuthProfileCredential,
  ProfileUsageStats,
  AuthProfileFailureReason,
} from "@ccfm/shared";
import { readJsonFile, writeJsonFile } from "../config/io.js";
import { withFileLock } from "../infra/file-lock.js";
import { resolveAuthProfilesPath } from "../config/paths.js";
import { getLogger } from "../logging/logger.js";
import { calculateCooldown } from "./cooldown.js";

const log = getLogger("auth");

/** Current store schema version. */
const STORE_VERSION = 1;

/** Build an empty store with defaults. */
function emptyStore(): AuthProfileStore {
  return {
    version: STORE_VERSION,
    profiles: {},
    order: {},
    lastGood: {},
    usageStats: {},
  };
}

/** Resolve the lock path for the auth profiles file. */
function lockPath(): string {
  return resolveAuthProfilesPath() + ".lock";
}

/** Load the store from disk (or return empty defaults). */
function loadStore(): AuthProfileStore {
  const data = readJsonFile<AuthProfileStore>(resolveAuthProfilesPath());
  if (!data) {
    log.debug("No auth profiles file found, using empty store");
    return emptyStore();
  }
  // Ensure all expected top-level keys exist
  return {
    version: data.version ?? STORE_VERSION,
    profiles: data.profiles ?? {},
    order: data.order ?? {},
    lastGood: data.lastGood ?? {},
    usageStats: data.usageStats ?? {},
  };
}

/** Persist the store to disk. */
function saveStore(store: AuthProfileStore): void {
  writeJsonFile(resolveAuthProfilesPath(), store);
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * List all profile IDs and their credentials.
 * Returns an array of [profileId, credential] tuples.
 */
export async function listProfiles(): Promise<
  Array<{ id: string; credential: AuthProfileCredential; stats?: ProfileUsageStats }>
> {
  return withFileLock(lockPath(), async () => {
    const store = loadStore();
    return Object.entries(store.profiles).map(([id, credential]) => ({
      id,
      credential,
      stats: store.usageStats?.[id],
    }));
  });
}

/**
 * Get a single profile by ID.
 * Returns the credential and usage stats, or undefined if not found.
 */
export async function getProfile(
  profileId: string,
): Promise<
  { id: string; credential: AuthProfileCredential; stats?: ProfileUsageStats } | undefined
> {
  return withFileLock(lockPath(), async () => {
    const store = loadStore();
    const credential = store.profiles[profileId];
    if (!credential) return undefined;
    return {
      id: profileId,
      credential,
      stats: store.usageStats?.[profileId],
    };
  });
}

/**
 * Insert or update a profile.
 * If the profile already exists, its credential is replaced.
 * Usage stats are preserved on update unless explicitly provided.
 */
export async function upsertProfile(
  profileId: string,
  credential: AuthProfileCredential,
  stats?: Partial<ProfileUsageStats>,
): Promise<void> {
  await withFileLock(lockPath(), async () => {
    const store = loadStore();
    const isNew = !(profileId in store.profiles);
    store.profiles[profileId] = credential;

    // Initialize or merge usage stats
    if (!store.usageStats) store.usageStats = {};
    const existing = store.usageStats[profileId] ?? {};
    store.usageStats[profileId] = { ...existing, ...stats };

    saveStore(store);
    log.info({ profileId, provider: credential.provider }, isNew ? "Profile added" : "Profile updated");
  });
}

/**
 * Remove a profile by ID.
 * Also cleans up associated usage stats, order entries, and lastGood references.
 */
export async function removeProfile(profileId: string): Promise<boolean> {
  return withFileLock(lockPath(), async () => {
    const store = loadStore();
    if (!(profileId in store.profiles)) {
      log.warn({ profileId }, "Attempted to remove non-existent profile");
      return false;
    }

    delete store.profiles[profileId];

    // Clean usage stats
    if (store.usageStats) {
      delete store.usageStats[profileId];
    }

    // Clean order arrays
    if (store.order) {
      for (const key of Object.keys(store.order)) {
        store.order[key] = store.order[key]!.filter((id) => id !== profileId);
      }
    }

    // Clean lastGood references
    if (store.lastGood) {
      for (const [provider, goodId] of Object.entries(store.lastGood)) {
        if (goodId === profileId) {
          delete store.lastGood[provider];
        }
      }
    }

    saveStore(store);
    log.info({ profileId }, "Profile removed");
    return true;
  });
}

/**
 * Mark a profile as recently used.
 * Updates lastUsed timestamp and clears error state on success.
 */
export async function markUsed(profileId: string): Promise<void> {
  await withFileLock(lockPath(), async () => {
    const store = loadStore();
    if (!(profileId in store.profiles)) {
      log.warn({ profileId }, "markUsed called for non-existent profile");
      return;
    }

    if (!store.usageStats) store.usageStats = {};
    const stats = store.usageStats[profileId] ?? {};
    stats.lastUsed = Date.now();

    // Successful use resets error counters
    stats.errorCount = 0;
    stats.cooldownUntil = undefined;
    stats.disabledUntil = undefined;
    stats.disabledReason = undefined;
    stats.failureCounts = undefined;
    stats.lastFailureAt = undefined;

    store.usageStats[profileId] = stats;

    // Track last good per provider
    const credential = store.profiles[profileId];
    if (credential && !store.lastGood) store.lastGood = {};
    if (credential) {
      store.lastGood![credential.provider] = profileId;
    }

    saveStore(store);
    log.debug({ profileId }, "Profile marked as used");
  });
}

/**
 * Mark a profile as failed.
 * Increments failure counters and applies cooldown based on failure reason.
 */
export async function markFailed(
  profileId: string,
  reason: AuthProfileFailureReason,
): Promise<void> {
  await withFileLock(lockPath(), async () => {
    const store = loadStore();
    if (!(profileId in store.profiles)) {
      log.warn({ profileId }, "markFailed called for non-existent profile");
      return;
    }

    if (!store.usageStats) store.usageStats = {};
    const stats = store.usageStats[profileId] ?? {};
    const now = Date.now();

    // Increment overall error count
    stats.errorCount = (stats.errorCount ?? 0) + 1;
    stats.lastFailureAt = now;

    // Increment per-reason failure count
    if (!stats.failureCounts) stats.failureCounts = {};
    const reasonCount = (stats.failureCounts[reason] ?? 0) + 1;
    stats.failureCounts[reason] = reasonCount;

    // Calculate and apply cooldown
    const cooldownMs = calculateCooldown(reasonCount, reason);
    if (cooldownMs > 0) {
      stats.cooldownUntil = now + cooldownMs;
      stats.disabledUntil = stats.cooldownUntil;
      stats.disabledReason = reason;
      log.info(
        { profileId, reason, cooldownMs, cooldownUntil: stats.cooldownUntil },
        "Profile placed in cooldown",
      );
    }

    store.usageStats[profileId] = stats;
    saveStore(store);
    log.debug({ profileId, reason, errorCount: stats.errorCount }, "Profile marked as failed");
  });
}

/**
 * Get the raw store (for advanced operations like order management).
 * Callers should use withFileLock externally if mutating.
 */
export async function getRawStore(): Promise<AuthProfileStore> {
  return withFileLock(lockPath(), async () => {
    return loadStore();
  });
}

/**
 * Save an entire store (for advanced operations).
 * Callers are responsible for data integrity.
 */
export async function saveRawStore(store: AuthProfileStore): Promise<void> {
  await withFileLock(lockPath(), async () => {
    saveStore(store);
  });
}
