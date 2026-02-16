/**
 * Human-readable display formatting for auth profiles.
 */

import type { AuthProfileCredential } from "@ccfm/shared";
import { maskSecret } from "@ccfm/shared";

/**
 * Format a profile credential into a human-readable label.
 *
 * Examples:
 *  - ApiKeyCredential  -> "anthropic (api_key: ****1234)"
 *  - TokenCredential   -> "openai (token: ****abcd)"
 *  - OAuthCredential   -> "google (oauth: user@gmail.com)"
 *
 * When an email is available it is preferred over masked secrets
 * since it is more recognizable to the user.
 */
export function formatProfileLabel(credential: AuthProfileCredential): string {
  const provider = credential.provider;

  switch (credential.type) {
    case "api_key": {
      const detail = credential.email
        ? credential.email
        : credential.key
          ? maskSecret(credential.key)
          : "no key";
      return `${provider} (api_key: ${detail})`;
    }

    case "token": {
      const detail = credential.email
        ? credential.email
        : maskSecret(credential.token);
      return `${provider} (token: ${detail})`;
    }

    case "oauth": {
      const detail = credential.email
        ? credential.email
        : credential.clientId
          ? maskSecret(credential.clientId)
          : maskSecret(credential.accessToken);
      return `${provider} (oauth: ${detail})`;
    }

    default: {
      // Exhaustiveness guard
      const _exhaustive: never = credential;
      return `${(credential as AuthProfileCredential).provider} (unknown)`;
    }
  }
}

/**
 * Format a profile ID and credential into a short display string.
 * Useful for log messages and CLI output.
 *
 * Example: "my-key [anthropic api_key ****1234]"
 */
export function formatProfileShort(
  profileId: string,
  credential: AuthProfileCredential,
): string {
  const masked = getMaskedIdentifier(credential);
  return `${profileId} [${credential.provider} ${credential.type} ${masked}]`;
}

/** Extract a masked identifier from a credential for display purposes. */
function getMaskedIdentifier(credential: AuthProfileCredential): string {
  switch (credential.type) {
    case "api_key":
      return credential.key ? maskSecret(credential.key) : "no key";
    case "token":
      return maskSecret(credential.token);
    case "oauth":
      return credential.email ?? maskSecret(credential.accessToken);
  }
}
