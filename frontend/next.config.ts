import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactCompiler: true,
  // Ensure allowedDevOrigins is correctly placed under experimental if using Next.js 14/15
  // experimental: {
  allowedDevOrigins: [
    'http://192.168.220.35:3000',
    'http://192.168.220.35:8022',
    'http://192.168.220.35',
    '192.168.220.35:3000',
    '192.168.220.35',
    'http://localhost:3000',
    'http://localhost:8022'
  ],
  // } as any,
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "mario-pos",
  project: "frontend",
});