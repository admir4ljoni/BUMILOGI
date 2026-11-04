import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  output: "standalone", // self-contained server.js for the Docker image
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
