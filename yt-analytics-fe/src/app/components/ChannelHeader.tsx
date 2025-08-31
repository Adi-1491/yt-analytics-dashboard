"use client";
import { formatNumber } from "../lib/format";
import type { ChannelSummary } from "../lib/api";

export default function ChannelHeader({ channel }: { channel: ChannelSummary }) {
  return (
    <section className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center gap-3">
        {channel.profilePic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={channel.profilePic} alt={channel.name} className="h-10 w-10 rounded-full" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-gray-700" />
        )}
        <div>
          <a
            href={`https://www.youtube.com/channel/${channel.channelId}`}
            target="_blank"
            rel="noreferrer"
            className="text-lg font-medium underline underline-offset-2 hover:opacity-80"
          >
            {channel.name}
          </a>
          <div className="text-xs text-gray-500">{channel.channelId}</div>
        </div>
      </div>

      <div className="flex gap-6 text-sm mt-2">
        <div>Subscribers: {formatNumber(channel.subscribers)}</div>
        <div>Total Views: {formatNumber(channel.totalViews)}</div>
        <div>Total Videos: {formatNumber(channel.totalVideos)}</div>
      </div>
    </section>
  );
}
