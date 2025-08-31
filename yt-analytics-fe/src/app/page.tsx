"use client";
import { useState, useEffect } from "react";
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

type ApiErrorData = { error?: string; message?: string };

function errorMessage(err: unknown): string {
  if (isAxiosError<ApiErrorData>(err)) {
    return err.response?.data?.error ?? err.response?.data?.message ?? err.message;
  }
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Unexpected error";
}


export default function HomePage() {
  const [health, setHealth] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setErr] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [maxResults, setMaxResults] = useState(10);


  const [channel, setChannel] = useState<ChannelSummary | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [recent, setRecent] = useState<VideoItem[] | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("lastSearch");
    if (saved) setInput(saved);
  }, []);

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
      const chan = await getChannelInfo(input.startsWith("http") ? { url: input.trim() } : { channelId: input.trim() });
      setChannel(chan);

       // persist last search for convenience
      localStorage.setItem("lastSearch", input.trim());

      const sum = await getChannelSummary(chan.channelId);
      setSummary(sum);

      const vids = await getRecentVideos(chan.channelId, maxResults, days);
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

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">YouTube Analytics — Dev</h1>

      <div className="flex items-center gap-2">
        <button onClick={checkHealth} className="rounded-md border px-3 py-2 text-sm">
          Check Backend Health
        </button>
        <span className="text-sm text-gray-600">{health}</span>
      </div>

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
      <div className="flex items-center gap-3 text-sm">
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
        <button
          onClick={() => { setInput(""); setChannel(null); setSummary(null); setRecent(null); }}
          className="rounded-md border px-3 py-1"
        >
          Clear
        </button>
      </div>

      {loading && <LoadingBlock lines={4} />}

      {!loading && channel && <ChannelHeader channel={channel} />}

      {!loading && summary && <AggregatesBar data={summary.aggregates} />}

      {!loading && recent && (
      <>
        <UploadsPerWeekChart data={uploadsPerWeek(recent)} />
        <ViewsOverTimeChart data={viewsOverTime(recent)} />
      </>
      )}
      
      {!loading && recent && <VideoTable videos={recent} />}

    </main>
  );
}
