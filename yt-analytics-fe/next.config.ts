// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },   // video thumbs
      { protocol: "https", hostname: "yt3.ggpht.com" }, // channel avatars
    ],
  },
};

export default nextConfig;
