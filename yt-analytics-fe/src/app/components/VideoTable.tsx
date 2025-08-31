"use client";
import { formatDate, formatNumber, formatPercent, formatISODuration } from "../lib/format";
import type { VideoItem } from "../lib/api";

export default function VideoTable({ videos }: { videos: VideoItem[] }) {
  if (!videos?.length) return null;

  return (
    <section className="rounded-lg border p-4">
      <h3 className="font-medium mb-2">Recent Videos</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-2">Title</th>
              <th className="p-2">Published</th>
              <th className="p-2">Duration</th>
              <th className="p-2 text-right">Views</th>
              <th className="p-2 text-right">Likes</th>
              <th className="p-2 text-right">Comments</th>
              <th className="p-2 text-right">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v) => (
              <tr key={v.videoId ?? Math.random()} className="border-t">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {v.thumbnails?.default?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={v.thumbnails.default.url}
                        alt=""
                        className="h-8 w-14 object-cover rounded"
                      />
                    )}
                    {v.videoId ? (
                      <a
                        href={`https://www.youtube.com/watch?v=${v.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:opacity-80"
                      >
                        {v.title ?? v.videoId}
                      </a>
                    ) : (
                      v.title ?? "-"
                    )}
                  </div>
                </td>
                <td className="p-2">{formatDate(v.publishedAt)}</td>
                <td className="p-2">{formatISODuration(v.duration)}</td>
                <td className="p-2 text-right">{formatNumber(v.views)}</td>
                <td className="p-2 text-right">{formatNumber(v.likes)}</td>
                <td className="p-2 text-right">{formatNumber(v.comments)}</td>
                <td className="p-2 text-right">{formatPercent(v.engagementRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
