import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer', 'pdfjs-dist'],
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.fs = false;
    return config;
  },
};

export default nextConfig;
