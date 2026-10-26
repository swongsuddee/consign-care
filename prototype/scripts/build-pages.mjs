// Static build for GitHub Pages: `BASE_PATH=/consign-care npm run build:pages` writes the site to out/.
// A static site has no server, so the AI route is moved out of the app for the build (an "_" folder is not routed).
// The export also writes its working files to .next, so an existing production build there (served by `next start`)
// is set aside and restored afterwards.
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const api = "src/app/api";
const parked = "src/app/_api";
const build = ".next";
const kept = ".next-kept";
if (existsSync(api)) renameSync(api, parked);
if (existsSync(build)) {
  rmSync(kept, { recursive: true, force: true });
  renameSync(build, kept);
}
try {
  rmSync("out", { recursive: true, force: true });
  execSync("next build", { stdio: "inherit", env: { ...process.env, PAGES: "1", NODE_OPTIONS: "--dns-result-order=ipv4first" } });
} finally {
  if (existsSync(parked)) renameSync(parked, api);
  if (existsSync(kept)) {
    rmSync(build, { recursive: true, force: true });
    renameSync(kept, build);
  }
}
