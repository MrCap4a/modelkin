import type { NextConfig } from "next";

// No `images.remotePatterns`: next/image's allowed remote hosts are baked
// in at build time, which conflicts with this project's env-configured,
// build-once-deploy-anywhere Docker image (the S3/MinIO host is only known
// at container runtime, not during `docker build`). S3-hosted images
// (model previews, avatars) are rendered as plain `<img>` instead — see the
// `eslint-disable @next/next/no-img-element` comments at each call site.
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
