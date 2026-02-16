import { Card } from "../common/Card";

interface BudgetGaugeProps {
  currentSpend: number;
  limit: number | null;
  projected: number;
}

export function BudgetGauge({ currentSpend, limit, projected }: BudgetGaugeProps) {
  const percentage = limit ? Math.min((currentSpend / limit) * 100, 100) : 0;
  const projectedPct = limit ? Math.min((projected / limit) * 100, 100) : 0;

  const barColor =
    percentage > 90 ? "bg-red-500" :
    percentage > 70 ? "bg-yellow-500" : "bg-brand-500";

  return (
    <Card title="Monthly Budget">
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <span className="text-3xl font-bold text-gray-900">${currentSpend.toFixed(2)}</span>
          {limit && <span className="text-sm text-gray-500">of ${limit.toFixed(2)}</span>}
        </div>

        {limit ? (
          <>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${percentage}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{percentage.toFixed(1)}% used</span>
              <span>Projected: ${projected.toFixed(2)} ({projectedPct.toFixed(0)}%)</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500">No budget limit set</p>
        )}
      </div>
    </Card>
  );
}
