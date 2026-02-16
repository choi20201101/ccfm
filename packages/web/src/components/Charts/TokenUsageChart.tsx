import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card } from "../common/Card";

interface TokenUsageChartProps {
  data: Array<{ name: string; input: number; output: number; cached: number }>;
  title?: string;
}

export function TokenUsageChart({ data, title = "Token Usage" }: TokenUsageChartProps) {
  return (
    <Card title={title}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Legend />
            <Bar dataKey="input" name="Input" fill="#3b6bff" radius={[2, 2, 0, 0]} />
            <Bar dataKey="output" name="Output" fill="#10b981" radius={[2, 2, 0, 0]} />
            <Bar dataKey="cached" name="Cached" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
