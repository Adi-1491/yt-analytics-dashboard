"use client";
import { parseISO, format } from "date-fns";
import {
  ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, CartesianGrid,
} from "recharts";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" });

type Point = { date: string; value: number };
type Props = { data: Point[]; label?: string; isPercent?: boolean };

export default function ViewsOverTimeChart({ data, label = "Value", isPercent = false }: Props) {
  if (!data?.length) return null;
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium mb-1">{label} Over Time</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM d")} tick={{ fill: "#9ca3af" }} />
            <YAxis
              tickFormatter={(v) => (isPercent ? `${v.toFixed(2)}%` : nf.format(v))}
              tick={{ fill: "#9ca3af" }}
            />
            <Tooltip
              formatter={(v: number) => [isPercent ? `${v.toFixed(2)}%` : nf.format(v), label]}
              labelFormatter={(label) => format(parseISO(label), "PPpp")}
              contentStyle={{ background: "#111827", border: "1px solid #374151", color: "#e5e7eb" }}
            />
            <Line type="monotone" dataKey="value" dot={false} stroke="#3b82f6" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
