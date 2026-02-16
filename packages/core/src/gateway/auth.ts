/**
 * Gateway authentication.
 * Supports token-based and IP-based request authentication.
 */

import type { GatewayAuth } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("gateway:auth");

/**
 * Authenticate an incoming request against the gateway auth configuration.
 * Returns true if the request is authorized.
 */
export function authenticateRequest(
  req: { header(name: string): string | undefined; ip?: string },
  config: GatewayAuth,
): boolean {
  // No auth configured — allow all
  if (config.type === "none") {
    return true;
  }

  // Token-based authentication
  if (config.type === "token") {
    if (!config.token) {
      log.warn("Token auth configured but no token set — denying all");
      return false;
    }

    const authHeader = req.header("Authorization");
    if (!authHeader) {
      log.debug("Missing Authorization header");
      return false;
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      log.debug("Malformed Authorization header");
      return false;
    }

    const provided = parts[1];
    if (provided !== config.token) {
      log.debug("Token mismatch");
      return false;
    }

    log.debug("Token auth succeeded");
    return true;
  }

  // IP-based authentication
  if (config.type === "ip") {
    if (!config.allowedIps || config.allowedIps.length === 0) {
      log.warn("IP auth configured but no IPs allowed — denying all");
      return false;
    }

    const clientIp = req.ip ?? req.header("X-Forwarded-For")?.split(",")[0]?.trim();
    if (!clientIp) {
      log.debug("Unable to determine client IP");
      return false;
    }

    const allowed = config.allowedIps.includes(clientIp);
    if (!allowed) {
      log.debug({ clientIp }, "IP not in allowed list");
    } else {
      log.debug({ clientIp }, "IP auth succeeded");
    }
    return allowed;
  }

  log.warn({ type: config.type }, "Unknown auth type — denying");
  return false;
}
