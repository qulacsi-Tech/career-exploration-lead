import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hides the floating Next.js dev badge in the bottom-left corner. Compile and
  // runtime errors are still surfaced. Dev-only — it never shipped to prod.
  devIndicators: false,
};

export default nextConfig;
