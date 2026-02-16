/**
 * Token usage and budget status API endpoints.
 * Surfaces token consumption data from the token engine.
 */

import { Hono } from "hono";
import type { TokenUsageSummary, BudgetStatus, ApiResponse } from "@ccfm/shared";
import { getTodayUsage, getMonthUsage } from "../../token-engine/index.js";
import { getLogger } from "../../logging/logger.js";

const log = getLogger("gateway:api:tokens");

/** Create the tokens API Hono router. */
export function createTokensRouter(): Hono {
  const router = new Hono();

  log.debug("Initializing tokens API router");

  // --- GET /usage ---
  router.get("/usage", (c) => {
    try {
      const raw = getTodayUsage();

      // Transform internal record-based shape to API array-based shape
      const byModel = Object.entries(raw.byModel).map(([key, val]) => {
        const [provider, ...modelParts] = key.split("/");
        return {
          model: modelParts.join("/") || key,
          provider: provider ?? "unknown",
          inputTokens: val.input,
          outputTokens: val.output,
          cost: val.cost,
        };
      });

      const bySession = Object.entries(raw.bySession).map(([key, val]) => ({
        sessionKey: key,
        inputTokens: val.input,
        outputTokens: val.output,
        cost: val.cost,
      }));

      const summary: TokenUsageSummary = {
        period: "today",
        inputTokens: raw.totalInput,
        outputTokens: raw.totalOutput,
        cacheReadTokens: raw.totalCacheRead,
        estimatedCost: raw.totalCost,
        byModel,
        bySession,
        savings: {
          compactionSaved: 0,
          cachingSaved: 0,
          routingSaved: 0,
          totalSaved: 0,
        },
      };

      const response: ApiResponse<TokenUsageSummary> = {
        success: true,
        data: summary,
      };
      return c.json(response);
    } catch (err) {
      log.error({ err }, "Failed to retrieve token usage");
      const response: ApiResponse = {
        success: false,
        error: { code: "USAGE_ERROR", message: "Failed to retrieve token usage" },
      };
      return c.json(response, 500);
    }
  });

  // --- GET /budget ---
  router.get("/budget", (c) => {
    try {
      const raw = getMonthUsage();
      const currentSpend = raw.totalCost;

      const budget: BudgetStatus = {
        monthlyLimitUsd: null,
        currentSpendUsd: currentSpend,
        remainingUsd: null,
        projectedMonthEndUsd: projectMonthEnd(currentSpend),
        alerts: [],
      };

      const response: ApiResponse<BudgetStatus> = {
        success: true,
        data: budget,
      };
      return c.json(response);
    } catch (err) {
      log.error({ err }, "Failed to retrieve budget status");
      const response: ApiResponse = {
        success: false,
        error: { code: "BUDGET_ERROR", message: "Failed to retrieve budget status" },
      };
      return c.json(response, 500);
    }
  });

  log.debug("Tokens API router initialized");
  return router;
}

/** Simple projection of current spend to month end. */
function projectMonthEnd(currentSpend: number): number {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (dayOfMonth === 0) return currentSpend;
  return (currentSpend / dayOfMonth) * daysInMonth;
}
