/**
 * Embedded agent runner.
 * Executes a single agent turn: build context, call provider,
 * process tool calls, and return the final response.
 */

import type { ConversationTurn } from "@ccfm/shared";
import { getLogger } from "../../logging/logger.js";
import type { AgentRunContext, AgentTurnResult } from "./types.js";

const log = getLogger("agents");

/** Execute one full agent turn (possibly multiple rounds for tool use). */
export async function runAgentTurn(
  context: AgentRunContext,
): Promise<AgentTurnResult> {
  const { provider, model, systemPrompt, tools, maxTokens, temperature } = context;
  const messages = [...context.messages];
  const allTurns: ConversationTurn[] = [];
  let allToolCalls: AgentTurnResult["toolCalls"] = [];

  log.info({ model, msgCount: messages.length, runId: context.runId }, "Agent turn started");

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await provider.sendMessage({
      model,
      messages,
      systemPrompt,
      tools,
      maxTokens,
      temperature,
    });

    allTurns.push({
      message: { role: "assistant", content: response.content },
      timestamp: Date.now(),
      tokenCount: response.usage.outputTokens,
      runId: context.runId,
    });

    // No tool calls -- return final response
    if (!response.toolCalls?.length || response.stopReason !== "tool_use") {
      log.info({ stopReason: response.stopReason }, "Agent turn finished");
      return {
        response: response.content,
        toolCalls: allToolCalls,
        usage: response.usage,
        turnMessages: allTurns,
        stopReason: response.stopReason,
      };
    }

    // Process each tool call
    allToolCalls = [...allToolCalls, ...response.toolCalls];
    for (const toolCall of response.toolCalls) {
      log.debug({ tool: toolCall.name, id: toolCall.id }, "Processing tool call");

      if (!context.onToolCall) {
        log.warn("No onToolCall handler, skipping tool execution");
        break;
      }

      const toolResultMsg = await context.onToolCall(toolCall);
      messages.push(
        { role: "assistant", content: response.content },
        toolResultMsg,
      );

      allTurns.push({
        message: toolResultMsg,
        timestamp: Date.now(),
        runId: context.runId,
      });
    }
  }
}
