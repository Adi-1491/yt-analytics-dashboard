"use client";
import React, { useEffect, useMemo, useState } from "react";
import { getCompetitorSummary, type CompetitorSummary } from "../lib/api";
import { Plus, X, BarChart3, RefreshCw, Radar as RadarIcon } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import Image from "next/image"

type SortKey = keyof Pick<
  CompetitorSummary,
  "avgViews10" | "avgER10" | "uploadsPerWeek" | "subs" | "totalViews" | "totalVideos"
>;
type SortDir = "asc" | "desc";

const fmt = new Intl.NumberFormat("en-US");
const fmtCompact = new Intl.NumberFormat("en-US", { notation: "compact" });

function pct(n: number) {
  if (!isFinite(n)) return "-";
  return `${n.toFixed(1)}%`;
}
function normalize(value: number, min: number, max: number) {
  if (!isFinite(value)) return 0;
  if (max === min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

export default function CompetitorCompare({ defaultChannels = [] as string[] }) {
  const [input, setInput] = useState("");
  const [channels, setChannels] = useState<string[]>(defaultChannels);
  const [data, setData] = useState<Record<string, CompetitorSummary | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("avgViews10");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // load summaries whenever list changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (channels.length === 0) {
        setData({});
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const entries = await Promise.all(
          channels.map(async (id) => {
            try {
              const summary = await getCompetitorSummary(id);
              return [id, summary] as const;
            } catch {
              return [id, null] as const;
            }
          })
        );
        if (!cancelled) {
          const map: Record<string, CompetitorSummary | null> = {};
          for (const [id, summary] of entries) map[id] = summary;
          setData(map);
        }
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load summaries");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channels]);

  function addChannel() {
    const raw = input.trim();
    if (!raw) return;
    const norm = raw.toLowerCase();
    if (!channels.some((c) => c.toLowerCase() === norm)) {
      setChannels((c) => [...c, raw]);
    }
    setInput("");
  }
  function removeChannel(id: string) {
    setChannels((c) => c.filter((x) => x !== id));
  }

  const rows = useMemo(() => {
    const list = channels.map((id) => data[id]).filter(Boolean) as CompetitorSummary[];
    return list.sort((a, b) => {
      const av = (a[sortKey] as unknown as number) ?? 0;
      const bv = (b[sortKey] as unknown as number) ?? 0;
      const diff = av - bv;
      return sortDir === "asc" ? diff : -diff;
    });
  }, [channels, data, sortDir, sortKey]);

  const ranges = useMemo(() => {
    const vals = (key: SortKey) => rows.map((r) => (r[key] as unknown as number) ?? 0);
    const min = (a: number[]) => (a.length ? Math.min(...a) : 0);
    const max = (a: number[]) => (a.length ? Math.max(...a) : 0);
    return {
      subs: [min(vals("subs")), max(vals("subs"))],
      totalViews: [min(vals("totalViews")), max(vals("totalViews"))],
      avgViews10: [min(vals("avgViews10")), max(vals("avgViews10"))],
      avgER10: [min(vals("avgER10")), max(vals("avgER10"))],
      uploadsPerWeek: [min(vals("uploadsPerWeek")), max(vals("uploadsPerWeek"))],
    } as const;
  }, [rows]);

  const radarData = useMemo(() => {
    return rows.map((r) => ({
      name: r.title || r.channelId,
      Subs: normalize(r.subs, ranges.subs[0], ranges.subs[1]),
      "Lifetime Views": normalize(r.totalViews, ranges.totalViews[0], ranges.totalViews[1]),
      "Avg Views (10)": normalize(r.avgViews10, ranges.avgViews10[0], ranges.avgViews10[1]),
      "Avg ER % (10)": normalize(r.avgER10, ranges.avgER10[0], ranges.avgER10[1]),
      "Uploads/Week": normalize(r.uploadsPerWeek, ranges.uploadsPerWeek[0], ranges.uploadsPerWeek[1]),
    }));
  }, [rows, ranges]);

  const barData = useMemo(() => {
    return rows.map((r) => ({ name: r.title || r.channelId, avgViews10: r.avgViews10 }));
  }, [rows]);


  const topAvgViews = Math.max(0, ...rows.map((r) => r.avgViews10));
  const topAvgER = Math.max(0, ...rows.map((r) => r.avgER10));
  const topUploads = Math.max(0, ...rows.map((r) => r.uploadsPerWeek));

  const cardClass = "rounded-2xl border p-4 bg-white dark:bg-zinc-900 border-zinc-700";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Comparison</h1>
          <p className="text-zinc-500">
            Add channels (UCID, full URL, or @handle) to benchmark performance.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            placeholder="Paste channel ID (UC…), full URL, or @handle"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-[360px] rounded-md border px-3 py-2 bg-transparent
                       border-zinc-700 text-zinc-100 placeholder:text-zinc-400"
          />
          <button
            onClick={addChannel}
            disabled={!input.trim()}
            className="rounded-md border px-3 py-2 text-sm border-zinc-700 text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            <Plus className="mr-2 h-4 w-4 inline-block" /> Add
          </button>
          <button
            onClick={() => setChannels([])}
            className="rounded-md border px-3 py-2 text-sm border-zinc-700 text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className="mr-2 h-4 w-4 inline-block" /> Reset
          </button>
        </div>
      </div>

      {/* Chips */}
      {channels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {channels.map((id) => (
            <div
              key={id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                         bg-zinc-800 text-zinc-200 border border-zinc-700"
            >
              <span className="truncate max-w-[220px]" title={id}>
                {id}
              </span>
              <button onClick={() => removeChannel(id)} className="opacity-80 hover:opacity-100">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error / Loading */}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading && <div className="text-sm text-zinc-400">Loading channel summaries…</div>}

      {/* KPIs */}
      <div className="grid md:grid-cols-4 gap-4">
        <Kpi label="Channels" value={fmt.format(channels.length)} />
        <Kpi label="Avg Views (10) — Top" value={fmtCompact.format(topAvgViews)} />
        <Kpi label="Avg ER% (10) — Top" value={pct(topAvgER)} />
        <Kpi label="Uploads / Week — Top" value={fmt.format(topUploads)} />
      </div>

      {/* Charts */}
      {rows.length > 0 ? (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-2">
              <RadarIcon className="h-4 w-4" />
              <h3 className="font-semibold">Normalized KPI Radar</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#52525b" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: "#a1a1aa" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#a1a1aa" }} stroke="#52525b" />
                  <Radar name="Subs" dataKey="Subs" stroke="#71717a" fill="#71717a" fillOpacity={0.25} />
                  <Radar name="Lifetime Views" dataKey="Lifetime Views" stroke="#a1a1aa" fill="#a1a1aa" fillOpacity={0.2} />
                  <Radar name="Avg Views (10)" dataKey="Avg Views (10)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                  <Radar name="Avg ER % (10)" dataKey="Avg ER % (10)" stroke="#86efac" fill="#86efac" fillOpacity={0.2} />
                  <Radar name="Uploads/Week" dataKey="Uploads/Week" stroke="#f5d0fe" fill="#f5d0fe" fillOpacity={0.2} />
                  <Legend wrapperStyle={{ color: "#e4e4e7" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4" />
              <h3 className="font-semibold">Average Views (Last 10) by Channel</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#a1a1aa" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                    stroke="#52525b"
                  />
                  <YAxis
                    tickFormatter={(v) => fmtCompact.format(v as number)}
                    tick={{ fill: "#a1a1aa" }}
                    stroke="#52525b"
                  />
                  <Tooltip
                    formatter={(v: unknown) => fmt.format(v as number)}
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                    labelStyle={{ color: "#e4e4e7" }}
                  />
                  <Bar dataKey="avgViews10" fill="#71717a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className={cardClass}>
          <div className="text-sm text-zinc-400">Add channels to see charts.</div>
        </div>
      )}

      {/* Table */}
      <div className={`${cardClass} overflow-x-auto`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-zinc-500">Sort by:</span>
          <div className="flex gap-2 flex-wrap">
            {(["avgViews10","avgER10","uploadsPerWeek","subs","totalViews","totalVideos"] as SortKey[]).map((key) => (
              <button
                key={key as string}
                onClick={() => setSortKey(key)}
                className={`rounded-md border px-2 py-1 text-sm border-zinc-700
                  ${sortKey === key
                    ? "bg-zinc-200 text-zinc-900"
                    : "text-zinc-200 hover:bg-zinc-800"}`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="rounded-md border px-2 py-1 text-sm border-zinc-700 text-zinc-200 hover:bg-zinc-800"
            >
              {sortDir === "asc" ? "Asc" : "Desc"}
            </button>
          </div>
        </div>
        <table className="min-w-full text-sm">
          <thead className="text-left">
            <tr className="border-b border-zinc-700">
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Subs</th>
              <th className="py-2 pr-4">Lifetime Views</th>
              <th className="py-2 pr-4">Total Videos</th>
              <th className="py-2 pr-4">Avg Views (10)</th>
              <th className="py-2 pr-4">Avg ER % (10)</th>
              <th className="py-2 pr-4">Uploads / Week</th>
              <th className="py-2 pr-4">Last Video</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.channelId} className="border-b border-zinc-800 last:border-0">
                <td className="py-2 pr-4 max-w-[280px]">
                  <div className="flex items-center gap-2">
                  {r.thumb ? (
                    <Image src={r.thumb} alt="" width={24} height={24} className="w-6 h-6 rounded" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-zinc-800" />
                    )}
                    <div className="truncate">
                      <div className="font-medium truncate" title={r.title}>
                        {r.title}
                      </div>
                      <div className="text-xs text-zinc-500 truncate" title={r.channelId}>
                        {r.channelId}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-2 pr-4">{fmtCompact.format(r.subs)}</td>
                <td className="py-2 pr-4">{fmtCompact.format(r.totalViews)}</td>
                <td className="py-2 pr-4">{fmt.format(r.totalVideos)}</td>
                <td className="py-2 pr-4">{fmtCompact.format(r.avgViews10)}</td>
                <td className="py-2 pr-4">{pct(r.avgER10)}</td>
                <td className="py-2 pr-4">{fmt.format(r.uploadsPerWeek)}</td>
                <td className="py-2 pr-4">
                  {r.lastVideosAt ? new Date(r.lastVideosAt).toLocaleDateString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <div className="text-sm text-zinc-500 py-6 text-center">Add channels to see comparisons.</div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border shadow-sm p-4 bg-white dark:bg-zinc-900 border-zinc-700">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold leading-snug">{value}</div>
    </div>
  );
}
