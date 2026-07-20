// Entry point: export THIS machine's ccusage data → rebuild manifest → git push.
// Auto-detects device by hostname (see DEVICE_BY_HOST in config.mjs).
// Usage: npm run collect [-- --no-git] [--no-push] [--offline] [--device X]
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, SOURCES, resolveDevice } from "./config.mjs";
import { exportSource } from "./ccusage.mjs";
import { rebuildManifest } from "./manifest.mjs";
import { publish } from "./git.mjs";

function parseArgs(argv) {
  const opts = { device: null, noGit: false, noPush: false, offline: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-git") opts.noGit = true;
    else if (a === "--no-push") opts.noPush = true;
    else if (a === "--offline") opts.offline = true;
    else if (a === "--device") opts.device = argv[++i];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const device = resolveDevice(opts.device);
  if (!device) process.exit(1);
  const deviceDir = join(DATA_DIR, device);
  mkdirSync(deviceDir, { recursive: true });
  console.log(`==> Device: ${device}`);
  for (const source of SOURCES) {
    console.log(`==> Exporting ${source} ...`);
    exportSource(source, deviceDir, opts.offline);
  }
  console.log("==> Rebuilding manifest ...");
  rebuildManifest();
  if (!opts.noGit) publish(device, !opts.noPush);
  console.log("==> Done.");
}

main();
