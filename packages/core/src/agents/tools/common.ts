/**
 * Built-in tool definitions available to all agents.
 * Each tool follows the provider-agnostic tool schema format.
 */

import { getLogger } from "../../logging/logger.js";

const log = getLogger("agents");

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Return the set of built-in tools available to every agent. */
export function getBuiltinTools(): ToolDefinition[] {
  log.debug("Loading built-in tool definitions");

  return [
    {
      name: "memory_search",
      description: "Search long-term memory for relevant past context.",
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query." },
          limit: { type: "number", description: "Max results." },
        },
        required: ["query"],
      },
    },
    {
      name: "current_time",
      description: "Get the current date and time in ISO 8601 format.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
  ];
}
