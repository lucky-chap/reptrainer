import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@reptrainer/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://localhost:3000",
    "https://localhost:3001",
    "https://10.119.205.50:3000",
    "https://10.119.205.50:3001",
  ],
};

export default nextConfig;
