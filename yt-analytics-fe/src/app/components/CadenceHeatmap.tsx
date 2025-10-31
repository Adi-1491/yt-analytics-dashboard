"use client";
import { useEffect, useMemo, useState } from "react";
import { getCadence, type CadenceResponse } from "../lib/api";

type Mode = "count" | "avgViews" | "avgER";

export default function CadenceHeatmap({
  channelId,
  limit = 100,
}: {
  channelId: string;
  limit?: number;
}) {
  const [data, setData] = useState<CadenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("count");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const d = await getCadence(channelId, limit, 2);
        if (mounted) setData(d);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Failed to load cadence");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [channelId, limit]);

  // pick which grid to display
  const grid = useMemo(() => {
    if (!data) return null;
    if (mode === "count") return data.grids.count;
    if (mode === "avgViews") return data.grids.avgViews;
    return data.grids.avgER;
  }, [data, mode]);

  // compute max for color scale (ignore nulls)
  const maxVal = useMemo(() => {
    if (!grid) return 1;
    let m = 0;
    for (const row of grid) {
      for (const v of row) {
        if (v == null) continue;
        if (typeof v === "number" && v > m) m = v;
      }
    }
    return m || 1;
  }, [grid]);

  if (err) return <div className="text-sm text-red-600">{err}</div>;
  if (loading) return <div className="text-sm opacity-70">Loading cadence…</div>;
  if (!data || !grid) return null;

  const { dayLabels, hourLabels, total, suggestions } = data;

  // label for a single cell
  function cellLabel(day: string, hour: number, val: number | null, samples: number) {
    if (mode === "count") {
      return `${day} @ ${hour}:00 — ${val ?? 0} upload${val === 1 ? "" : "s"}`;
    }
    if (mode === "avgViews") {
      const txt = val != null ? Number(val).toLocaleString() : "—";
      return `${day} @ ${hour}:00 — Avg Views: ${txt} (n=${samples})`;
    }
    // avgER mode
    const txt = val != null ? `${(Number(val) * 100).toFixed(2)}%` : "—";
    return `${day} @ ${hour}:00 — Avg ER: ${txt} (n=${samples})`;
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-medium">Posting Cadence (IST)</h3>
        <span className="text-xs opacity-60">Analyzed: {total} uploads</span>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 text-xs">
        <button
          className={`px-2 py-1 rounded border ${mode === "count" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setMode("count")}>
          Uploads
        </button>
        <button
          className={`px-2 py-1 rounded border ${mode === "avgViews" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setMode("avgViews")}
        >
          Avg Views
        </button>
        <button
          className={`px-2 py-1 rounded border ${mode === "avgER" ? "opacity-100" : "opacity-60"}`}
          onClick={() => setMode("avgER")}
        >
          Avg ER
        </button>
      </div>

      {/* Hour header row */}
      <div
        className="text-xs grid"
        style={{ gridTemplateColumns: `auto repeat(${hourLabels.length}, minmax(0, 1fr))` }}
      >
        <div className="p-1" />
        {hourLabels.map((h) => (
          <div key={h} className="p-1 text-center opacity-70">
            {h}
          </div>
        ))}
      </div>

      {/* 7×24 heat grid */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `auto repeat(${hourLabels.length}, minmax(0, 1fr))` }}
        role="table"
        aria-label={`Heatmap (${mode}) by day and hour in IST`}
      >
        {grid.map((row, di) => (
          <Row
            key={`row-${di}`}
            label={dayLabels[di]}
            values={row}
            maxVal={maxVal}
            dayLabel={dayLabels[di]}
            // pass count grid for sample size in tooltips
            samplesRow={data.grids.count[di]}
          />
        ))}
      </div>

      <p className="text-xs opacity-70">
        Darker = higher {mode === "count" ? "uploads" : mode === "avgViews" ? "average views" : "average engagement rate"} in that hour (IST).
        Monday is the first row.
      </p>

      {/* Metrics explanation */}
        <div className="text-xs space-y-2 p-3 bg-black rounded-md mt-4">
          <h4 className="font-semibold">Understanding the Metrics:</h4>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium inline">n = </dt>
              <dd className="inline">Number of video samples in this time slot</dd>
            </div>
            <div>
              <dt className="font-medium inline">ER (Engagement Rate) = </dt>
              <dd className="inline">
                ((Likes + Comments) / Views) × 100%
                <span className="block text-white mt-1">
                  • Ranges from 0% to 100%
                  <br />
                  • Higher percentages indicate better audience engagement
                  <br />
                  • Industry average is typically 3-5%
                </span>
              </dd>
            </div>
          </dl>
        </div>

      {/* Best time suggestions (from backend) */}
      <Suggestions
        dayLabels={dayLabels}
        label={mode === "avgER" ? "Best windows (Avg ER)" : "Best windows (Avg Views)"}
        items={mode === "avgER" ? suggestions.topByAvgER : suggestions.topByAvgViews}
        mode={mode}
      />
    </section>
  );

  function Row({
    label,
    values,
    maxVal,
    dayLabel,
    samplesRow,
  }: {
    label: string;
    values: Array<number | null>;
    maxVal: number;
    dayLabel: string;
    samplesRow: number[];
  }) {
    return (
      <>
        {/* Day label */}
        <div className="text-xs p-1 pr-2 text-right opacity-80" role="rowheader">
          {label}
        </div>

        {/* 24 hour cells */}
        {values.map((val, hi) => {
          const raw = val ?? 0;
          // normalize; for ER we still scale with max (which is a fraction 0..1)
          const intensity = maxVal > 0 ? (val == null ? 0 : raw / maxVal) : 0;
          const bg = `rgba(59, 130, 246, ${0.12 + 0.88 * intensity})`;

          const title = cellLabel(dayLabel, hi, val, samplesRow[hi] ?? 0);

          return (
            <div
              key={`cell-${label}-${hi}`}
              role="gridcell"
              aria-label={title}
              className="h-6 rounded-sm border border-black/5 dark:border-white/5"
              style={{ backgroundColor: val ? bg : "transparent" }}
              title={title}
            />
          );
        })}
      </>
    );
  }
}

function Suggestions({
  dayLabels,
  label,
  items,
  mode,
}: {
  dayLabels: string[];
  label: string;
  items: Array<{ day: number; hour: number; value: number | null; samples: number; avgViews: number; avgER: number | null }>;
  mode: Mode;
}) {
  return (
    <div className="text-xs opacity-80 space-y-1">
      <div className="font-medium">{label}</div>
      <ul className="list-disc ml-4">
        {items.map((s, i) => (
          <li key={i}>
            {dayLabels[s.day]} {s.hour}:00 —{" "}
            {mode === "avgER"
              ? s.value != null
                ? `${(Number(s.value) * 100).toFixed(1)}% Avg ER`
                : "—"
              : `${Number(s.value ?? 0).toLocaleString()} Avg Views`}{" "}
            (n={s.samples}, ER={s.avgER != null ? (s.avgER * 100).toFixed(1) + "%" : "—"})
          </li>
        ))}
      </ul>
    </div>
  );
}
