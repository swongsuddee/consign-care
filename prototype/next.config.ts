import type { NextConfig } from "next";

// `npm run build:pages` sets PAGES=1: a static export for GitHub Pages, served under BASE_PATH (e.g. /consign-care)
const pages = process.env.PAGES === "1";
const basePath = pages ? (process.env.BASE_PATH ?? "").replace(/\/$/, "") : "";

const nextConfig: NextConfig = {
  ...(pages && {
    output: "export",
    distDir: "out", // the exported site; keeps a running `next start` on .next untouched
    trailingSlash: true,
    basePath,
    images: { unoptimized: true },
  }),
  env: { NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_STATIC: pages ? "1" : "" },
};

export default nextConfig;
