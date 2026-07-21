import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@overmind-lab/trace-sdk"],
  serverExternalPackages: ["pdf-parse", "googleapis", "google-auth-library"],
};

export default nextConfig;
