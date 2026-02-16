import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Card } from "../common/Card";

interface CostChartProps {
  data: Array<{ date: string; cost: number; budget?: number }>;
  title?: string;
}

export function CostChart({ data, title = "Cost Trend" }: CostChartProps) {
  return (
    <Card title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis fontSize={12} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, ""]} />
            <Line type="monotone" dataKey="cost" stroke="#3b6bff" strokeWidth={2} dot={false} />
            {data.some((d) => d.budget != null) && (
              <Line type="monotone" dataKey="budget" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
