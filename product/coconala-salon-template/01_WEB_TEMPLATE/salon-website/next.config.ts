import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Prefer AVIF, falling back to WebP, over the source JPEGs (Phase 2A
    // §20 performance / Phase 2C §7) — Next tries formats in this order
    // based on the request's `Accept` header.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
