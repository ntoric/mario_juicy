import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import fs from 'fs';
import path from 'path';

// Load environment variables from ../env/.env.frontend if available
const envPath = path.resolve(process.cwd(), '../env/.env.frontend');
if (fs.existsSync(envPath)) {
  console.log('[NextConfig] Loading additional env from:', envPath);
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) return;
    const [key, ...valueParts] = trimmedLine.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      // Only set if not already set by system/docker
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
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

const config = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "mario-pos",
  project: "frontend",
});

export default withPWA(config as any);