/**
 * Environment variable substitution in config values.
 * Supports ${VAR}, ${VAR:-default}, and ${VAR:?error message} syntax.
 */

/** Pattern matching ${VAR}, ${VAR:-default}, ${VAR:?error} */
const ENV_VAR_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([?-])([^}]*))?\}/g;

/** Substitute environment variables in a string value. */
export function substituteEnvVars(value: string): string {
  return value.replace(ENV_VAR_PATTERN, (_match, name: string, op?: string, param?: string) => {
    const envValue = process.env[name];

    if (envValue !== undefined && envValue !== "") {
      return envValue;
    }

    // ${VAR:-default} — use default if unset or empty
    if (op === "-" && param !== undefined) {
      return param;
    }

    // ${VAR:?error} — throw if unset or empty
    if (op === "?" && param !== undefined) {
      throw new Error(`Environment variable ${name} is required: ${param}`);
    }

    // No op: return empty string for unset vars
    return "";
  });
}

/**
 * Recursively substitute environment variables in a config object.
 * Only processes string values.
 */
export function substituteEnvVarsDeep(obj: unknown): unknown {
  if (typeof obj === "string") {
    return substituteEnvVars(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => substituteEnvVarsDeep(item));
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteEnvVarsDeep(value);
    }
    return result;
  }

  return obj;
}
