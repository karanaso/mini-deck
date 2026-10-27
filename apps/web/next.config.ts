import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mini-deck/deck"],
  serverExternalPackages: ["sharp", "yjs"],
};

export default nextConfig;
