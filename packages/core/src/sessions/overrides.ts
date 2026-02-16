/**
 * Session-level model and provider overrides.
 * Allows per-session customization of model, provider, and other fields.
 */

import type { SessionEntry } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("sessions:overrides");

/** Fields that can be overridden at the session level. */
type OverridableField = keyof Pick<
  SessionEntry,
  | "providerOverride"
  | "modelOverride"
  | "authProfileOverride"
  | "authProfileOverrideSource"
  | "thinkLevelOverride"
  | "verboseLevelOverride"
>;

/** In-memory session override store. Keyed by sessionKey, then field. */
const overrides = new Map<string, Map<OverridableField, string>>();

/** Get a session override value for a specific field. */
export function getSessionOverride(
  sessionKey: string,
  field: OverridableField,
): string | undefined {
  const sessionOverrides = overrides.get(sessionKey);
  if (!sessionOverrides) {
    return undefined;
  }
  return sessionOverrides.get(field);
}

/** Set a session override value for a specific field. */
export function setSessionOverride(
  sessionKey: string,
  field: OverridableField,
  value: string,
): void {
  let sessionOverrides = overrides.get(sessionKey);
  if (!sessionOverrides) {
    sessionOverrides = new Map();
    overrides.set(sessionKey, sessionOverrides);
  }
  sessionOverrides.set(field, value);
  log.info({ sessionKey, field, value }, "Session override set");
}

/** Clear all overrides for a session. */
export function clearSessionOverrides(sessionKey: string): void {
  const had = overrides.delete(sessionKey);
  if (had) {
    log.info({ sessionKey }, "Session overrides cleared");
  }
}
