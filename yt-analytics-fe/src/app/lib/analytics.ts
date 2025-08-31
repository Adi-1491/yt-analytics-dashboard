import { startOfWeek, addWeeks, formatISO, parseISO, isBefore } from "date-fns";
import type { VideoItem } from "./api";

function fillWeeks(minISO: string, maxISO: string, counts: Map<string, number>) {
  const out: { week: string; count: number }[] = [];
  let cur = startOfWeek(parseISO(minISO), { weekStartsOn: 1 });
  const end = startOfWeek(parseISO(maxISO), { weekStartsOn: 1 });
  while (!isBefore(end, cur)) {
    const key = formatISO(cur, { representation: "date" });
    out.push({ week: key, count: counts.get(key) ?? 0 });
    cur = addWeeks(cur, 1);
  }
  return out;
}

export function uploadsPerWeek(videos: VideoItem[]) {
  const buckets = new Map<string, number>();
  const dates: string[] = [];
  for (const v of videos) {
    if (!v.publishedAt) continue;
    const week = startOfWeek(parseISO(v.publishedAt), { weekStartsOn: 1 });
    const key = formatISO(week, { representation: "date" });
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    dates.push(v.publishedAt);
  }
  if (!dates.length) return [];
  const min = dates.reduce((a, b) => (a < b ? a : b));
  const max = dates.reduce((a, b) => (a > b ? a : b));
  return fillWeeks(min, max, buckets);
}

export function viewsOverTime(videos: VideoItem[]) {
  return videos
    .filter((v) => v.publishedAt && typeof v.views === "number")
    .map((v) => ({ date: v.publishedAt!, views: v.views as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
