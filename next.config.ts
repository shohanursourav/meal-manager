import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The browser talks straight to Supabase; the Next server never proxies data.
  experimental: {
    // Keeps the client bundle lean for a mobile-first app.
    optimizePackageImports: ["@supabase/supabase-js"],
  },
};

export default nextConfig;
