/**
 * Detect and parse /commands from incoming messages.
 */

import type { CommandMatch } from "./types.js";
import { getLogger } from "../logging/logger.js";

const log = getLogger("auto-reply:commands");

const COMMAND_PATTERN = /^\/([a-zA-Z_][\w]*)\s*(.*)/s;

/** Command aliases. */
const ALIASES: Record<string, string> = {
  h: "help",
  "?": "help",
  s: "status",
  c: "config",
  r: "reset",
  m: "model",
};

/** Try to parse a /command from a message text. */
export function detectCommand(text: string): CommandMatch | null {
  const trimmed = text.trim();
  const match = COMMAND_PATTERN.exec(trimmed);
  if (!match) return null;

  const rawCmd = match[1]!.toLowerCase();
  const command = ALIASES[rawCmd] ?? rawCmd;
  const argsStr = match[2]?.trim() ?? "";
  const args = argsStr ? argsStr.split(/\s+/) : [];

  log.debug({ command, args }, "Command detected");
  return { command, args, raw: trimmed };
}

/** Check if a text starts with a command prefix. */
export function isCommand(text: string): boolean {
  return COMMAND_PATTERN.test(text.trim());
}
