import type { NextConfig } from "next";

const CLOUDFRONT_HOST = (process.env.NEXT_PUBLIC_CLOUDFRONT_URL ?? '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(CLOUDFRONT_HOST
        ? [{ protocol: 'https' as const, hostname: CLOUDFRONT_HOST, pathname: '/**' }]
        : []),
    ],
  },
};

export default nextConfig;
