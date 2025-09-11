"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getHealth,
  getChannelInfo,
  getChannelSummary,
  getRecentVideos,
  type ChannelSummary,
  type SummaryResponse,
  type VideoItem,
} from "./lib/api";

import { LoadingBlock } from "./components/LoadingBlock";
import ChannelHeader from "./components/ChannelHeader";
import AggregatesBar from "./components/AggregatesBar";
import VideoTable from "./components/VideoTable";
import UploadsPerWeekChart from "./components/UploadsPerWeekChart";
import ViewsOverTimeChart from "./components/ViewsOverTimeChart";

import { uploadsPerWeek, viewsOverTime } from "./lib/analytics";
import { isAxiosError } from "axios";
import { durationToSeconds } from "./lib/format"; 

// ---- small error helper -----------------------------------------------------
type ApiErrorData = { error?: string; message?: string };

function errorMessage(err: unknown): string {
  if (isAxiosError<ApiErrorData>(err)) {
    return err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}

// ---- page -------------------------------------------------------------------
export default function HomePage() {
  // status / inputs
  const [health, setHealth] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filters
  const [days, setDays] = useState(30);
  const [maxResults, setMaxResults] = useState(10);

  // data
  const [channel, setChannel] = useState<ChannelSummary | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [recent, setRecent] = useState<VideoItem[] | null>(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const videosPerPage = 10;

  // sorting state for the table
  type SortKey =
  | "title"
  | "publishedAt"
  | "duration"
  | "views"
  | "likes"
  | "comments"
  | "engagementRate";
type SortDir = "asc" | "desc";

const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
const [sortDir, setSortDir] = useState<SortDir>("desc");

const sortedRecent = useMemo<VideoItem[]>(() => {
  if (!recent) return [];
  const dir = sortDir === "asc" ? 1 : -1;

  const getVal = (v: VideoItem): number | string => {
    switch (sortKey) {
      case "title":
        return v.title ?? "";
      case "publishedAt":
        return v.publishedAt ? Date.parse(v.publishedAt) : Number.NEGATIVE_INFINITY;
      case "duration":
        return durationToSeconds(v.duration) ?? Number.NEGATIVE_INFINITY;
      case "views":
        return typeof v.views === "number" ? v.views : Number.NEGATIVE_INFINITY;
      case "likes":
        return typeof v.likes === "number" ? v.likes : Number.NEGATIVE_INFINITY;
      case "comments":
        return typeof v.comments === "number" ? v.comments : Number.NEGATIVE_INFINITY;
      case "engagementRate":
        return typeof v.engagementRate === "number" ? v.engagementRate : Number.NEGATIVE_INFINITY;
    }
  };

  return [...recent].sort((a, b) => {
    const A = getVal(a);
    const B = getVal(b);
    if (typeof A === "string" && typeof B === "string") {
      return dir * A.localeCompare(B);
    }
    return dir * ((A as number) - (B as number));
  });
}, [recent, sortKey, sortDir]);

// Get videos for the current page
const paginatedVideos = useMemo(() => {
  const startIndex = (currentPage - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  return sortedRecent.slice(startIndex, endIndex);
}, [sortedRecent, currentPage]);

function toggleSort(key: SortKey) {
  if (sortKey === key) {
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  } else {
    setSortKey(key);
    setSortDir(key === "title" ? "asc" : "desc");
  }
}

// Pagination controls
const totalPages = Math.ceil((recent?.length || 0) / videosPerPage);

function goToNextPage() {
  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
}

function goToPreviousPage() {
  setCurrentPage((prev) => Math.max(prev - 1, 1));
}

function goToPage(page: number) {
  setCurrentPage(page);
}

  // hydrate last query
  useEffect(() => {
    const saved = localStorage.getItem("lastSearch");
    if (saved) setInput(saved);
  }, []);

  // actions
  async function checkHealth() {
    setErr(null);
    try {
      const h = await getHealth();
      setHealth(
        h.ok ? `Server OK — key loaded: ${h.envKeyLoaded ? "yes" : "no"} (${h.keyPreview ?? "-"})` : "Server not OK"
      );
    } catch (e: unknown) {
      setHealth(null);
      setErr(errorMessage(e));
    }
  }

  async function onSearch() {
    setLoading(true);
    setErr(null);
    setChannel(null);
    setSummary(null);
    setRecent(null);

    try {
      // 1) resolve channel
      const chan = await getChannelInfo(input.startsWith("http") ? { url: input.trim() } : { channelId: input.trim() });
      setChannel(chan);
      localStorage.setItem("lastSearch", input.trim());

      // 2) fetch summary (with filters)
      const sum = await getChannelSummary(chan.channelId, { days, maxResults });
      setSummary(sum);

      // 3) fetch recent videos (with filters)
      const vids = await getRecentVideos(chan.channelId, { days, maxResults });
      setRecent(vids);
    } catch (e: unknown) {
      setErr(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && input.trim() && !loading) onSearch();
  }

  // ui
  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">YouTube Analytics — Dev</h1>

      {/* health */}
      <div className="flex items-center gap-2">
        <button onClick={checkHealth} className="rounded-md border px-3 py-2 text-sm">
          Check Backend Health
        </button>
        <span className="text-sm text-gray-600">{health}</span>
      </div>

      {/* search */}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2"
          placeholder="Paste channel URL or channelId (UC...)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={onSearch} disabled={loading || !input.trim()} className="rounded-md border px-3 py-2 text-sm">
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Days:
          <input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 30)))}
            className="w-20 rounded-md border px-2 py-1"
          />
        </label>
        <label className="flex items-center gap-2">
          Max Results:
          <input
            type="number"
            min={1}
            max={50}
            value={maxResults}
            onChange={(e) => setMaxResults(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            className="w-24 rounded-md border px-2 py-1"
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="text-gray-500">Quick:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-md border px-2 py-1 ${days === d ? "bg-gray-200 text-black" : ""}`}
            >
              {d}d
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setInput("");
            setChannel(null);
            setSummary(null);
            setRecent(null);
          }}
          className="rounded-md border px-3 py-1"
        >
          Clear
        </button>
      </div>

      {/* error + loading */}
      {err && <div className="text-red-600 text-sm">{err}</div>}
      {loading && <LoadingBlock lines={4} />}

      {/* channel */}
      {!loading && channel && <ChannelHeader channel={channel} />}

      {/* aggregates */}
      {!loading && summary && <AggregatesBar data={summary.aggregates} />}

      {/* charts */}
      {!loading && recent && (
        <>
          <UploadsPerWeekChart data={uploadsPerWeek(recent)} />
          <ViewsOverTimeChart
            data={viewsOverTime(recent).map(({ date, views }) => ({ date, value: views }))}
            label="Views"
          />
        </>
      )}

      {/* table (paginated) */}
      {!loading && recent && (
        <>
          <VideoTable
            videos={paginatedVideos}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
          />
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="rounded-md border px-3 py-1"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => goToPage(Number(e.target.value))}
              className="w-16 text-center border rounded-md"
            />
            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="rounded-md border px-3 py-1"
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}