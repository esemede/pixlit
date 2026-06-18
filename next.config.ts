import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript:  { ignoreBuildErrors: true },
  eslint:      { ignoreDuringBuilds: true },
};

export default nextConfig;

// Cloudflare Workers dev integration (no-op in production)
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
