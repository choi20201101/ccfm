/**
 * Authentication profile types.
 * Matches OpenClaw's auth profile system with round-robin and cooldown.
 */

export type AuthProfileCredentialType = "api_key" | "token" | "oauth";

export interface ApiKeyCredential {
  type: "api_key";
  provider: string;
  key?: string;
  email?: string;
  metadata?: Record<string, string>;
}

export interface TokenCredential {
  type: "token";
  provider: string;
  token: string;
  expires?: number; // ms since epoch
  email?: string;
}

export interface OAuthCredential {
  type: "oauth";
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // ms since epoch
  clientId?: string;
  email?: string;
}

export type AuthProfileCredential =
  | ApiKeyCredential
  | TokenCredential
  | OAuthCredential;

export type AuthProfileFailureReason =
  | "auth"
  | "format"
  | "rate_limit"
  | "billing"
  | "timeout"
  | "unknown";

export interface ProfileUsageStats {
  lastUsed?: number;
  cooldownUntil?: number;
  disabledUntil?: number;
  disabledReason?: AuthProfileFailureReason;
  errorCount?: number;
  failureCounts?: Partial<Record<AuthProfileFailureReason, number>>;
  lastFailureAt?: number;
}

export interface AuthProfileStore {
  version: number;
  profiles: Record<string, AuthProfileCredential>;
  /** Per-agent override order for profile rotation. */
  order?: Record<string, string[]>;
  /** Last known good profile per provider. */
  lastGood?: Record<string, string>;
  /** Usage statistics for round-robin selection. */
  usageStats?: Record<string, ProfileUsageStats>;
}
