/**
 * Subsystem-aware structured logger built on pino.
 * Supports per-subsystem log levels and secret redaction.
 */

import pino from "pino";
import type { LogLevel } from "@ccfm/shared";

let rootLogger: pino.Logger | null = null;
const subsystemLoggers = new Map<string, pino.Logger>();

export interface LoggerConfig {
  level: LogLevel;
  subsystems?: Record<string, LogLevel>;
  redactSecrets?: boolean;
}

/** Known secret patterns to redact from logs. */
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{20,}/g,         // OpenAI keys
  /sk-ant-[A-Za-z0-9-]{20,}/g,    // Anthropic keys
  /xoxb-[A-Za-z0-9-]+/g,          // Slack tokens
  /ghp_[A-Za-z0-9]{36}/g,         // GitHub PATs
  /gho_[A-Za-z0-9]{36}/g,         // GitHub OAuth
  /AKIA[A-Z0-9]{16}/g,            // AWS access key
];

function redactSecrets(obj: unknown): unknown {
  if (typeof obj === "string") {
    let result = obj;
    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(pattern, (match) => {
        return match.slice(0, 6) + "****" + match.slice(-4);
      });
    }
    return result;
  }
  if (Array.isArray(obj)) return obj.map(redactSecrets);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const keyLower = k.toLowerCase();
      if (keyLower.includes("key") || keyLower.includes("secret") ||
          keyLower.includes("token") || keyLower.includes("password")) {
        result[k] = typeof v === "string" ? "****" + v.slice(-4) : "[REDACTED]";
      } else {
        result[k] = redactSecrets(v);
      }
    }
    return result;
  }
  return obj;
}

/** Initialize the root logger. Call once at startup. */
export function initLogger(config: LoggerConfig): void {
  const transport = pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
    },
  });

  rootLogger = pino({
    level: config.level,
    formatters: {
      log(obj: Record<string, unknown>) {
        if (config.redactSecrets !== false) {
          return redactSecrets(obj) as Record<string, unknown>;
        }
        return obj;
      },
    },
  }, transport);
}

/** Get or create a logger for a specific subsystem. */
export function getLogger(subsystem: string): pino.Logger {
  if (!rootLogger) {
    // Fallback before init
    initLogger({ level: "info" });
  }

  let child = subsystemLoggers.get(subsystem);
  if (!child) {
    child = rootLogger!.child({ subsystem });
    subsystemLoggers.set(subsystem, child);
  }
  return child;
}

/** Update subsystem log levels at runtime. */
export function setSubsystemLevel(subsystem: string, level: LogLevel): void {
  const logger = subsystemLoggers.get(subsystem);
  if (logger) {
    logger.level = level;
  }
}

/** Get the root pino logger. */
export function getRootLogger(): pino.Logger {
  if (!rootLogger) initLogger({ level: "info" });
  return rootLogger!;
}
