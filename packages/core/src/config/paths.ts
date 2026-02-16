/**
 * Configuration directory and file path resolution.
 * Windows 11 primary, cross-platform support.
 */

import { join } from "node:path";
import { homedir } from "node:os";
import { existsSync, mkdirSync } from "node:fs";
import { CONFIG_FILE_NAME, CONFIG_DIR_ENV } from "@ccfm/shared";

/** Resolve the CCFM config directory. Priority:
 *  1. CCFM_CONFIG_DIR env var
 *  2. Windows: %APPDATA%/ccfm
 *  3. macOS: ~/Library/Application Support/ccfm
 *  4. Linux: ~/.config/ccfm
 */
export function resolveConfigDir(): string {
  const envDir = process.env[CONFIG_DIR_ENV];
  if (envDir) return envDir;

  const platform = process.platform;
  if (platform === "win32") {
    const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return join(appData, "ccfm");
  }
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "ccfm");
  }
  // Linux / others: XDG_CONFIG_HOME or ~/.config
  const xdg = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(xdg, "ccfm");
}

/** Resolve the data directory (sessions, transcripts, etc.). */
export function resolveDataDir(): string {
  const platform = process.platform;
  if (platform === "win32") {
    const localAppData =
      process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(localAppData, "ccfm", "data");
  }
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "ccfm", "data");
  }
  const xdg = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(xdg, "ccfm", "data");
}

/** Resolve agent config directories (where IDENTITY.md, skills live). */
export function resolveAgentDir(agentId: string): string {
  return join(resolveConfigDir(), "agents", agentId);
}

/** Resolve the main config file path. */
export function resolveConfigFilePath(): string {
  return join(resolveConfigDir(), CONFIG_FILE_NAME);
}

/** Resolve the auth profiles file path. */
export function resolveAuthProfilesPath(): string {
  return join(resolveConfigDir(), "auth-profiles.json");
}

/** Resolve the models config file path. */
export function resolveModelsConfigPath(): string {
  return join(resolveConfigDir(), "models.json");
}

/** Resolve session storage directory. */
export function resolveSessionDir(customPath?: string): string {
  return customPath ?? join(resolveDataDir(), "sessions");
}

/** Resolve memory/vector DB storage directory. */
export function resolveMemoryDir(): string {
  return join(resolveDataDir(), "memory");
}

/** Resolve log directory. */
export function resolveLogDir(): string {
  return join(resolveDataDir(), "logs");
}

/** Ensure a directory exists, creating it recursively if needed. */
export function ensureDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/** Ensure the config directory structure exists. */
export function ensureConfigDirStructure(): void {
  const configDir = resolveConfigDir();
  ensureDir(configDir);
  ensureDir(join(configDir, "agents"));
  ensureDir(resolveDataDir());
  ensureDir(resolveSessionDir());
  ensureDir(resolveLogDir());
}
