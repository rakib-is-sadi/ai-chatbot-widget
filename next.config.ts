import type { NextConfig } from "next";

// Websites that are allowed to show the assistant.
// Add a new line here when you put the assistant on another site.
const ALLOWED_SITES = [
  "https://rakibul-sadi.vercel.app",
  "http://localhost:5173", // your portfolio while developing locally
];

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${ALLOWED_SITES.join(" ")}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;