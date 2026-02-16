import { useStatus, useTokenUsage } from "@/api/hooks";
import { StatCard } from "@/components/common/StatCard";
import { TokenUsageChart } from "@/components/Charts/TokenUsageChart";
import { Loading } from "@/components/common/Loading";

export function DashboardPage() {
  const { data: status, isLoading: statusLoading } = useStatus();
  const { data: usage, isLoading: usageLoading } = useTokenUsage();

  if (statusLoading) return <Loading />;

  const usageData = usage as Record<string, unknown> | undefined;
  const inputTokens = (usageData?.inputTokens as number) ?? 0;
  const outputTokens = (usageData?.outputTokens as number) ?? 0;
  const cost = (usageData?.estimatedCost as number) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Status" value={status ? "Online" : "Offline"} />
        <StatCard label="Input Tokens" value={inputTokens.toLocaleString()} />
        <StatCard label="Output Tokens" value={outputTokens.toLocaleString()} />
        <StatCard label="Estimated Cost" value={`$${cost.toFixed(4)}`} />
      </div>

      {!usageLoading && (
        <TokenUsageChart
          data={[
            { name: "Today", input: inputTokens, output: outputTokens, cached: 0 },
          ]}
        />
      )}
    </div>
  );
}
