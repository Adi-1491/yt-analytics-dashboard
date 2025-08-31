"use client";
import { parseISO, format } from "date-fns";
import {
  ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, Line, CartesianGrid,
} from "recharts";

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" });

type Point = { date: string; views: number };
type Props = { data: Point[] };

export default function ViewsOverTimeChart({ data }: Props) {
  if (!data?.length) return null;

  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium mb-2">Views Over Time</h3>
      <div className="h-64 text-gray-300">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), "MMM d")} />
            <YAxis tickFormatter={(v) => nf.format(v)} />
            <Tooltip
              formatter={(value: number) => [nf.format(value), "Views"]}
              labelFormatter={(label) => format(parseISO(label), "PPpp")}
            />
            <Line type="monotone" dataKey="views" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
