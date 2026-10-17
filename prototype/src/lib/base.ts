/**
 * Where the app is served from. A GitHub Pages build (`npm run build:pages`) lives under /<repo> and has no server,
 * so paths to files in public/ go through `asset`, and the AI reader (/api/extract) is switched off.
 */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const STATIC_SITE = process.env.NEXT_PUBLIC_STATIC === "1";
export const asset = (p: string) => (p.startsWith("/") && !p.startsWith("//") ? BASE + p : p);
