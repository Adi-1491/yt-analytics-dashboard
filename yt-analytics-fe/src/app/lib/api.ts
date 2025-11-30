import axios from "axios";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050/api/youtube";

/* ---------- Types (mirror your backend responses) ---------- */

export interface ChannelSummary {
  channelId: string;
  name: string;
  description?: string | null;
  profilePic: string | null;
  subscribers: number | string | null;
  totalViews: number | string | null;
  totalVideos: number | string | null;
}

export interface Thumbnail {
  url: string;
  width?: number;
  height?: number;
}

export interface VideoItem {
  videoId: string | null;
  title: string | null;
  publishedAt: string | null;
  thumbnails?: { default?: Thumbnail; medium?: Thumbnail; high?: Thumbnail };
  duration: string | null; // ISO 8601 e.g., "PT12M30S"
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementRate: number | null; // fraction 0..1
}

export interface Aggregates {
  avgViews: number | null;
  medianViews: number | null;
  uploadPerWeek: number;
}

export interface SummaryResponse {
  channel: ChannelSummary;
  aggregates: Aggregates;
  videos: VideoItem[];
}

export type CadenceResponse = {
  grids: {
    count: number[][];
    avgViews: number[][];
    avgER: (number | null)[][];
  };
  dayLabels: string[];
  hourLabels: number[];
  total: number;
  suggestions: {
    minCount: number;
    topByAvgViews: Array<{ day:number; hour:number; value:number; samples:number; avgViews:number; avgER:number|null }>;
    topByAvgER: Array<{ day:number; hour:number; value:number|null; samples:number; avgViews:number; avgER:number|null }>;
  };
};

/* ---------- Requests ---------- */

type ChannelInput = { url: string } | { channelId: string };
export type FetchOpts = { maxResults?: number; days?: number };

type RecentRequest = {
  channelId: string;
  maxResults?: number;
  days?: number;
};

/* ---------- API calls ---------- */

export async function getHealth() {
  // health is at /api/health (not under /youtube)
  const base = API_BASE.replace(/\/youtube$/, "");
  const { data } = await axios.get(`${base}/health`);
  return data as { ok: boolean; envKeyLoaded: boolean; keyPreview: string | null };
}

export async function getChannelInfo(input: ChannelInput): Promise<ChannelSummary> {
  const { data } = await axios.post(`${API_BASE}/channel`, input);
  return data as ChannelSummary;
}

export async function getChannelSummary(
  channelId: string,
  opts: FetchOpts = {}
): Promise<SummaryResponse> {
  const payload = { channelId, ...opts };
  const { data } = await axios.post(`${API_BASE}/summary`, payload);
  return data as SummaryResponse;
}

export async function getRecentVideos(
  channelId: string,
  opts: FetchOpts = {}
): Promise<VideoItem[]> {
  const body: RecentRequest = { channelId, ...opts };
  const { data } = await axios.post(`${API_BASE}/recent`, body);
  return data as VideoItem[];
}

export async function getCadence(channelId: string, limit = 100, minCount = 2) {
  const { data } = await axios.get<CadenceResponse>(`${API_BASE}/insights/cadence`, {
    params: { channelId, limit, minCount },
  });
  return data;
}

export type CompetitorSummary = {
  channelId: string,
  handle?: string | null,
  title: string,
  thumb?: string | null,
  subs: number,
  totalViews: number,
  totalVideos: number,
  avgViews10: number, // avg of last 10 videos
  avgER10: number, // percent (0..100)
  uploadsPerWeek: number,
  lastVideosAt?: string | null;
}

function _asNumber (x: unknown, fallBack = 0) : number {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallBack;
}

export async function getCompetitorSummary(input:string) : Promise<CompetitorSummary> {
  const raw = input.trim();
  const looksUC = /^UC[a-zA-Z0-9_-]{22}$/.test(raw);
  const isUrl = /^https?:\/\//i.test(raw);
  const isHandle = raw.startsWith("@") || (!looksUC && !isUrl && !raw.includes(" "));

  const chan = await getChannelInfo(
    looksUC ? { channelId: raw }
            : isHandle ? { url: raw.startsWith("@") ? raw : `@${raw}` }
                       : { url: raw }
  );

  //Get Video History
  const summary = await getChannelSummary(chan.channelId, {days:365, maxResults: 20});

  //Get Last 10 Videos (Sorted by Date)
  const vids = [...(summary.videos || [])]
        .sort((a,b) => Date.parse(b.publishedAt || "0") - Date.parse(a.publishedAt || "0"))
        .slice(0, 10);

  //calculate average views(last 10 videos)
  const avgViews10 = vids.length ? Math.round(vids.reduce((s,v) => s + _asNumber(v.views), 0) / vids.length) : 0;

  //engagement rate of each video
  const ers = vids.map(v => {
    const views = _asNumber(v.views);
    if(!views) return 0;
    const likes = _asNumber(v.likes);
    const comments = _asNumber(v.comments);
    return ((likes + comments)/views) * 100;
  });

  //calculate avg engagement rate
  const avgER10 = ers.length ? Number((ers.reduce((a,b) => a + b, 0) / ers.length).toFixed(2)) : 0;

  return {
    channelId: chan.channelId,
    handle: null,
    title: chan.name,
    thumb: chan.profilePic || null,
    subs: _asNumber(chan.subscribers),
    totalViews: _asNumber(chan.totalViews),
    totalVideos: _asNumber(chan.totalVideos),
    avgViews10,
    avgER10,
    uploadsPerWeek: summary.aggregates?.uploadPerWeek ?? 0,
    lastVideosAt: vids[0]?.publishedAt || null,
  };
}