import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const backendOrigin = process.env.PORTAL_BACKEND_ORIGIN || "http://127.0.0.1:3100";
const configRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: configRoot,
  turbopack: {
    root: configRoot
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendOrigin}/api/:path*` },
      { source: "/auth/:path*", destination: `${backendOrigin}/auth/:path*` },
      { source: "/webhooks/:path*", destination: `${backendOrigin}/webhooks/:path*` }
    ];
  }
};

export default nextConfig;
