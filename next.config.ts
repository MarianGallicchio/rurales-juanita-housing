import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
