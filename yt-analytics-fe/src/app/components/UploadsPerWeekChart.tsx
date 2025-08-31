"use client";
import { parseISO, format } from "date-fns";
import {
  ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, CartesianGrid,
} from "recharts";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" });

export default function UploadsPerWeekChart({ data }: { data: { week: string; count: number }[] }) {
  if (!data?.length) return null;
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium mb-2">Uploads per Week</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            {/* gradient fill for bars */}
            <defs>
              <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={1} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.95} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="week"
              tickFormatter={(w) => format(parseISO(w), "MMM d")}
              tick={{ fill: "#9ca3af" }}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickFormatter={(v) => nf.format(v)}
              tick={{ fill: "#9ca3af" }}
            />
            <Tooltip
              formatter={(value: number) => [nf.format(value), "Uploads"]}
              labelFormatter={(label) => `Week of ${format(parseISO(label), "MMM d, yyyy")}`}
              contentStyle={{ background: "#111827", border: "1px solid #374151", color: "#e5e7eb" }}
            />
            {/* set a visible fill; swap for fill="#3b82f6" if you don't want a gradient */}
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
