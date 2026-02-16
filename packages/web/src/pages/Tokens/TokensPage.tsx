import { useTokenUsage, useTokenBudget } from "@/api/hooks";
import { StatCard } from "@/components/common/StatCard";
import { TokenUsageChart } from "@/components/Charts/TokenUsageChart";
import { BudgetGauge } from "@/components/Charts/BudgetGauge";
import { CostChart } from "@/components/Charts/CostChart";
import { Loading } from "@/components/common/Loading";
import { Card } from "@/components/common/Card";

export function TokensPage() {
  const { data: usage, isLoading: usageLoading } = useTokenUsage();
  const { data: budget, isLoading: budgetLoading } = useTokenBudget();

  if (usageLoading || budgetLoading) return <Loading />;

  const u = usage as Record<string, unknown> | undefined;
  const b = budget as Record<string, unknown> | undefined;

  const inputTokens = (u?.inputTokens as number) ?? 0;
  const outputTokens = (u?.outputTokens as number) ?? 0;
  const cacheTokens = (u?.cacheReadTokens as number) ?? 0;
  const cost = (u?.estimatedCost as number) ?? 0;
  const monthlyLimit = (b?.monthlyLimitUsd as number | null) ?? null;
  const currentSpend = (b?.currentSpendUsd as number) ?? 0;
  const projected = (b?.projectedMonthEndUsd as number) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Token Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Input Tokens" value={inputTokens.toLocaleString()} />
        <StatCard label="Output Tokens" value={outputTokens.toLocaleString()} />
        <StatCard label="Cache Hits" value={cacheTokens.toLocaleString()} />
        <StatCard label="Cost Today" value={`$${cost.toFixed(4)}`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BudgetGauge currentSpend={currentSpend} limit={monthlyLimit} projected={projected} />
        <TokenUsageChart
          data={[{ name: "Today", input: inputTokens, output: outputTokens, cached: cacheTokens }]}
          title="Today's Usage"
        />
      </div>

      <CostChart data={[{ date: "Today", cost }]} title="Cost Trend" />

      <Card title="Savings Summary">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">60-80%</p>
            <p className="text-xs text-gray-500">Target Savings</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600">2-tier</p>
            <p className="text-xs text-gray-500">Compaction</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">5%</p>
            <p className="text-xs text-gray-500">Safety Margin</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
