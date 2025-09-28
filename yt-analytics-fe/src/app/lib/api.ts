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