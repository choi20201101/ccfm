/**
 * Real-time token usage monitoring.
 * Tracks per-session and per-model usage.
 */

import type { TokenUsage, TokenReport } from "@ccfm/shared";
import { getLogger } from "../logging/logger.js";

const log = getLogger("token-engine:monitor");

/** In-memory usage store. */
const usageStore: TokenReport[] = [];

/** Record a token usage report. */
export function recordUsage(report: TokenReport): void {
  usageStore.push(report);
  log.debug(
    { model: report.model, input: report.inputTokens, output: report.outputTokens, cost: report.estimatedCost },
    "Token usage recorded",
  );
}

/** Get usage summary for a time period. */
export function getUsageSummary(
  periodStartMs: number,
  periodEndMs = Date.now(),
): {
  totalInput: number;
  totalOutput: number;
  totalCacheRead: number;
  totalCost: number;
  byModel: Record<string, { input: number; output: number; cost: number }>;
  bySession: Record<string, { input: number; output: number; cost: number }>;
} {
  const reports = usageStore.filter(
    (r) => r.timestamp >= periodStartMs && r.timestamp <= periodEndMs,
  );

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCost = 0;
  const byModel: Record<string, { input: number; output: number; cost: number }> = {};
  const bySession: Record<string, { input: number; output: number; cost: number }> = {};

  for (const r of reports) {
    totalInput += r.inputTokens;
    totalOutput += r.outputTokens;
    totalCacheRead += r.cacheReadTokens;
    totalCost += r.estimatedCost;

    const mk = `${r.provider}/${r.model}`;
    if (!byModel[mk]) byModel[mk] = { input: 0, output: 0, cost: 0 };
    const modelEntry = byModel[mk]!;
    modelEntry.input += r.inputTokens;
    modelEntry.output += r.outputTokens;
    modelEntry.cost += r.estimatedCost;

    if (r.sessionKey) {
      if (!bySession[r.sessionKey]) bySession[r.sessionKey] = { input: 0, output: 0, cost: 0 };
      const sessionEntry = bySession[r.sessionKey]!;
      sessionEntry.input += r.inputTokens;
      sessionEntry.output += r.outputTokens;
      sessionEntry.cost += r.estimatedCost;
    }
  }

  return { totalInput, totalOutput, totalCacheRead, totalCost, byModel, bySession };
}

/** Get today's usage. */
export function getTodayUsage() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return getUsageSummary(todayStart.getTime());
}

/** Get this month's usage. */
export function getMonthUsage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return getUsageSummary(monthStart.getTime());
}

/** Get all reports (for persistence). */
export function getAllReports(): TokenReport[] {
  return [...usageStore];
}

/** Clear usage data. */
export function clearUsageData(): void {
  usageStore.length = 0;
}
