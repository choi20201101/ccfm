/**
 * Custom error hierarchy for CCFM.
 */

/** Base error for all CCFM errors. */
export class CcfmError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = "CcfmError";
    this.code = code;
    this.details = details;
  }
}

/** Configuration-related errors. */
export class ConfigError extends CcfmError {
  constructor(message: string, details?: unknown) {
    super(message, "CONFIG_ERROR", details);
    this.name = "ConfigError";
  }
}

/** Provider/API communication errors. */
export class ProviderError extends CcfmError {
  public readonly provider: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    provider: string,
    opts?: { statusCode?: number; isRetryable?: boolean; details?: unknown },
  ) {
    super(message, "PROVIDER_ERROR", opts?.details);
    this.name = "ProviderError";
    this.provider = provider;
    this.statusCode = opts?.statusCode;
    this.isRetryable = opts?.isRetryable ?? false;
  }
}

/** Rate limit hit. */
export class RateLimitError extends ProviderError {
  public readonly retryAfterMs?: number;

  constructor(provider: string, retryAfterMs?: number) {
    super(`Rate limited by ${provider}`, provider, {
      statusCode: 429,
      isRetryable: true,
    });
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

/** Billing/quota exceeded. */
export class BillingError extends ProviderError {
  constructor(provider: string, message?: string) {
    super(message ?? `Billing limit exceeded for ${provider}`, provider, {
      statusCode: 402,
      isRetryable: false,
    });
    this.name = "BillingError";
  }
}

/** Context window overflow. */
export class ContextOverflowError extends CcfmError {
  public readonly tokenCount: number;
  public readonly maxTokens: number;

  constructor(tokenCount: number, maxTokens: number) {
    super(
      `Context overflow: ${tokenCount} tokens exceeds ${maxTokens} limit`,
      "CONTEXT_OVERFLOW",
    );
    this.name = "ContextOverflowError";
    this.tokenCount = tokenCount;
    this.maxTokens = maxTokens;
  }
}

/** Auth profile errors. */
export class AuthError extends CcfmError {
  public readonly profileId?: string;

  constructor(message: string, profileId?: string) {
    super(message, "AUTH_ERROR", { profileId });
    this.name = "AuthError";
    this.profileId = profileId;
  }
}

/** Channel communication errors. */
export class ChannelError extends CcfmError {
  public readonly channelId: string;

  constructor(message: string, channelId: string, details?: unknown) {
    super(message, "CHANNEL_ERROR", details);
    this.name = "ChannelError";
    this.channelId = channelId;
  }
}

/** Plugin errors. */
export class PluginError extends CcfmError {
  public readonly pluginId: string;

  constructor(message: string, pluginId: string, details?: unknown) {
    super(message, "PLUGIN_ERROR", details);
    this.name = "PluginError";
    this.pluginId = pluginId;
  }
}

/** Check if an error is a transient HTTP error (worth retrying). */
export function isTransientError(err: unknown): boolean {
  if (err instanceof ProviderError) return err.isRetryable;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("etimedout") ||
      msg.includes("socket hang up") ||
      msg.includes("503") ||
      msg.includes("502")
    );
  }
  return false;
}
