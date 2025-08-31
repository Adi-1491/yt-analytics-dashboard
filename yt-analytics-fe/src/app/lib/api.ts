import axios from "axios";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5050/api/youtube";

// ---- Types that mirror your backend responses (adjust later if needed) ----
export interface ChannelSummary {
  channelId: string;
  name: string;
  description?: string | null;
  profilePic: string | null;
  subscribers: number | string | null;
  totalViews: number | string | null;
  totalVideos: number | string | null;
}

export interface Thumbnail { url: string; width: number; height: number; }

export interface VideoItem {
  videoId: string | null;
  title: string | null;
  publishedAt: string | null;
  thumbnails?: { default?: Thumbnail; medium?: Thumbnail; high?: Thumbnail; };
  duration: string | null;     // e.g., "PT12M30S"
  views: number | null;
  likes: number | null;
  comments: number | null;
  engagementRate: number | null;
}

export interface Aggregates {
  avgViews: number | null;
  medianViews: number | null;
  uploadPerWeek: number;
}

export interface SummaryResponse {
  channel: ChannelSummary;
  aggregates: Aggregates;
  videos: VideoItem[];         // ok if empty
}

// ——— API calls ———
type ChannelInput = { url: string } | { channelId: string };

// type HealthResponse = {
//   ok: boolean;
//   envKeyLoaded: boolean;
//   keyPreview: string | null;
// };

type RecentRequest = {
  channelId: string;
  maxResults?: number;
  days?: number;
};

export async function getHealth() {
  // your server exposes /api/health at the root (not under /youtube)
  const base = API_BASE.replace("/youtube", "");
  const { data } = await axios.get(`${base}/health`);
  return data as { ok: boolean; envKeyLoaded: boolean; keyPreview: string | null };
}

export async function getChannelInfo(input: ChannelInput): Promise<ChannelSummary> {
  const { data } = await axios.post(`${API_BASE}/channel`, input);
  return data;
}

export type FetchOpts = { maxResults?: number; days?: number };

export async function getChannelSummary(channelId: string): Promise<SummaryResponse> {
  const { data } = await axios.post(`${API_BASE}/summary`, { channelId });
  return data;
}

export async function getRecentVideos(
  channelId: string,
  maxResults?: number,
  days?: number
): Promise<VideoItem[]> {
  const body: RecentRequest = { channelId };
  
  if (typeof maxResults === "number") body.maxResults = maxResults;
  if (typeof days === "number") body.days = days;

  const { data } = await axios.post(`${API_BASE}/recent`, body);
  return data;
}

