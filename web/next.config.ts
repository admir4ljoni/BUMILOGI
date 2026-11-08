import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  cacheComponents: true,
  partialPrefetching: true,
  // Edition images uploaded from the admin (PLAN.md "Images").
  images: { remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }] },
};

export default nextConfig;
