import { mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, SOURCES, resolveDevice } from "./config.mjs";
import { exportSource } from "./ccusage.mjs";
import { rebuildManifest } from "./manifest.mjs";
import { publish } from "./git.mjs";
import { REPO_ROOT } from "./config.mjs";

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

function setupLogging(device) {
  const logDir = join(REPO_ROOT, "logs", device);
  mkdirSync(logDir, { recursive: true });
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
  const logPath = join(logDir, `${date}.log`);

  const origLog = console.log;
  const origErr = console.error;
  const ts = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`;
  };
  console.log = (...args) => {
    const line = `[${ts()}] ${args.join(" ")}\n`;
    origLog.apply(console, args);
    try { appendFileSync(logPath, line, "utf8"); } catch {}
  };
  console.error = (...args) => {
    const line = `[${ts()}] ERROR ${args.join(" ")}\n`;
    origErr.apply(console, args);
    try { appendFileSync(logPath, line, "utf8"); } catch {}
  };
  console.log(`Log: ${logPath}`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const device = resolveDevice(opts.device);
  if (!device) process.exit(1);

  setupLogging(device);

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
