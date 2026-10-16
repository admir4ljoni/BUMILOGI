import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  output: "standalone", // self-contained server.js for the Docker image
  cacheComponents: true,
  partialPrefetching: true,
  // Keeps browser → Go calls same-origin in dev and in the all-in-one Docker setup.
  // In prod Nginx routes /api/ to Go before Next sees it.
  rewrites: async () => [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://127.0.0.1:8080"}/api/:path*` }],
};

export default nextConfig;
