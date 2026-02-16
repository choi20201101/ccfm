/**
 * Agents module — multi-agent orchestration, identity, context, and execution.
 */

// Scope resolution
export { listAgentIds, resolveDefaultAgentId, resolveAgentConfig } from "./agent-scope.js";

// Identity / persona
export { resolveIdentity, buildSystemPrompt } from "./identity.js";
export type { ResolvedIdentity } from "./identity.js";

// Context building
export { buildAgentContext } from "./context.js";
export type { AgentContext } from "./context.js";

// Context window guard
export {
  HARD_MIN_CONTEXT,
  WARN_MIN_CONTEXT,
  validateContextWindow,
} from "./context-window-guard.js";
export type { ContextWindowValidation } from "./context-window-guard.js";

// Compaction triggers
export { shouldCompact, triggerCompaction } from "./compaction.js";

// Runner
export { runAgentTurn } from "./runner/embedded-runner.js";
export type { AgentRunContext, AgentTurnResult } from "./runner/types.js";

// Built-in tools
export { getBuiltinTools } from "./tools/common.js";
export type { ToolDefinition } from "./tools/common.js";
