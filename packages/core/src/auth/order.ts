/**
 * Auth profile ordering and round-robin rotation.
 *
 * Selection strategy:
 *  1. Filter to profiles matching the requested provider
 *  2. Skip disabled profiles (disabledUntil in the future)
 *  3. Skip profiles currently in cooldown
 *  4. Sort by credential type priority: oauth > token > api_key
 *  5. Within same type: least recently used first (round-robin)
 */

import type {
  AuthProfileCredential,
  AuthProfileCredentialType,
  ProfileUsageStats,
} from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";
import { getRawStore } from "./store.js";
import { isInCooldown } from "./cooldown.js";

const log = getLogger("auth");

/** Credential type priority — higher number = preferred. */
const CREDENTIAL_TYPE_PRIORITY: Record<AuthProfileCredentialType, number> = {
  oauth: 3,
  token: 2,
  api_key: 1,
};

export interface OrderedProfile {
  id: string;
  credential: AuthProfileCredential;
  stats: ProfileUsageStats;
}

/**
 * Resolve the ordered list of available auth profiles for a given provider.
 *
 * Returns profiles sorted by:
 *  1. Credential type priority (oauth > token > api_key)
 *  2. Least recently used first within the same type (round-robin)
 *
 * Profiles that are disabled or in cooldown are excluded.
 */
export async function resolveAuthProfileOrder(
  providerId: string,
): Promise<OrderedProfile[]> {
  const store = await getRawStore();
  const now = Date.now();
  const candidates: OrderedProfile[] = [];

  for (const [id, credential] of Object.entries(store.profiles)) {
    // Filter by provider
    if (credential.provider !== providerId) continue;

    const stats: ProfileUsageStats = store.usageStats?.[id] ?? {};

    // Skip disabled profiles
    if (stats.disabledUntil != null && stats.disabledUntil > now) {
      log.debug(
        { profileId: id, disabledUntil: stats.disabledUntil },
        "Skipping disabled profile",
      );
      continue;
    }

    // Skip profiles in cooldown
    if (isInCooldown(stats)) {
      log.debug(
        { profileId: id, cooldownUntil: stats.cooldownUntil },
        "Skipping profile in cooldown",
      );
      continue;
    }

    candidates.push({ id, credential, stats });
  }

  // Sort: primary by credential type priority (descending), secondary by lastUsed (ascending = round-robin)
  candidates.sort((a, b) => {
    const typePriorityA = CREDENTIAL_TYPE_PRIORITY[a.credential.type] ?? 0;
    const typePriorityB = CREDENTIAL_TYPE_PRIORITY[b.credential.type] ?? 0;

    // Higher priority type first
    if (typePriorityA !== typePriorityB) {
      return typePriorityB - typePriorityA;
    }

    // Within same type: least recently used first (round-robin)
    const lastUsedA = a.stats.lastUsed ?? 0;
    const lastUsedB = b.stats.lastUsed ?? 0;
    return lastUsedA - lastUsedB;
  });

  log.debug(
    { providerId, count: candidates.length, ids: candidates.map((c) => c.id) },
    "Resolved auth profile order",
  );

  return candidates;
}

/**
 * Get the next best profile for a provider.
 * Convenience wrapper that returns the first profile from the ordered list.
 */
export async function getNextProfile(
  providerId: string,
): Promise<OrderedProfile | undefined> {
  const ordered = await resolveAuthProfileOrder(providerId);
  return ordered[0];
}
