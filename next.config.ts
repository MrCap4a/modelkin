import type { NextConfig } from "next";

const s3PublicHost = process.env.S3_PUBLIC_HOST_FOR_CSP;

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(s3PublicHost
        ? [
            {
              protocol: s3PublicHost.startsWith("https") ? "https" as const : "http" as const,
              hostname: new URL(s3PublicHost).hostname,
              port: new URL(s3PublicHost).port || undefined,
            },
          ]
        : []),
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
