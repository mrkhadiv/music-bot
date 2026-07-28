import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "node-telegram-bot-api",
    "fluent-ffmpeg",
    "node-id3",
  ],
};

export default nextConfig;
