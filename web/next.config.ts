import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: keeps browser → Go calls same-origin. In prod Nginx routes /api/ to Go before Next sees it.
  rewrites: async () => [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://127.0.0.1:8080"}/api/:path*` }],
};

export default nextConfig;
