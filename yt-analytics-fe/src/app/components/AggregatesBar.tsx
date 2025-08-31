"use client";
import { formatNumber } from "../lib/format";
import type { SummaryResponse } from "../lib/api";

export default function AggregatesBar({ data }: { data: SummaryResponse["aggregates"] }) {
  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium mb-2">Aggregates</h3>
      <div className="flex gap-6 text-sm">
        <div>Avg Views: {formatNumber(data.avgViews)}</div>
        <div>Median Views: {formatNumber(data.medianViews)}</div>
        <div>Uploads / Week: {data.uploadPerWeek}</div>
      </div>
    </section>
  );
}
