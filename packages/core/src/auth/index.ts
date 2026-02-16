/**
 * Auth module barrel export.
 * Profile management with round-robin rotation and exponential backoff.
 */

// Store — CRUD operations
export {
  listProfiles,
  getProfile,
  upsertProfile,
  removeProfile,
  markUsed,
  markFailed,
  getRawStore,
  saveRawStore,
} from "./store.js";

// Order — profile selection and rotation
export {
  resolveAuthProfileOrder,
  getNextProfile,
} from "./order.js";
export type { OrderedProfile } from "./order.js";

// Cooldown — exponential backoff
export { calculateCooldown, isInCooldown } from "./cooldown.js";

// Display — human-readable labels
export { formatProfileLabel, formatProfileShort } from "./display.js";
