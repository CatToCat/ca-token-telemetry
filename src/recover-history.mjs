// Rebuild data/*/*.json from git history using the most complete daily record.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { DATA_DIR, REPO_ROOT } from "./config.mjs";
import { chooseDailyRecord, normalizeUsage } from "./usage-ledger.mjs";
import { rebuildManifest } from "./manifest.mjs";

function git(args, opts = {}) {
  return spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    ...opts,
  });
}

function listDataFiles() {
  const files = new Set();

  const tracked = git(["ls-files", "data/**/*.json"]);
  for (const file of (tracked.stdout || "").split(/\r?\n/)) {
    if (file && basename(file) !== "manifest.json") files.add(file);
  }

  if (existsSync(DATA_DIR)) {
    for (const device of readdirSync(DATA_DIR, { withFileTypes: true })) {
      if (!device.isDirectory()) continue;
      const deviceDir = join(DATA_DIR, device.name);
      for (const source of readdirSync(deviceDir, { withFileTypes: true })) {
        if (source.isFile() && source.name.endsWith(".json")) {
          files.add(`data/${device.name}/${source.name}`);
        }
      }
    }
  }

  return [...files].sort();
}

function readJsonAt(ref, file) {
  const shown = git(["show", `${ref}:${file}`], { stdio: ["ignore", "pipe", "ignore"] });
  if (shown.status !== 0 || !shown.stdout.trim()) return null;
  try {
    return JSON.parse(shown.stdout);
  } catch {
    return null;
  }
}

function recoverFile(file) {
  const byDate = new Map();
  const current = readJsonAt("HEAD", file);
  if (current?.daily) {
    for (const row of current.daily) {
      if (row?.date) byDate.set(row.date, row);
    }
  }

  const history = git(["log", "--all", "--reverse", "--format=%H%x09%ci", "--", file]);
  for (const line of (history.stdout || "").split(/\r?\n/)) {
    if (!line) continue;
    const [commit, date] = line.split("\t");
    const data = readJsonAt(commit, file);
    if (!data?.daily) continue;
    const capturedAt = date ? date.slice(0, 16) : null;
    for (const row of data.daily) {
      if (!row?.date) continue;
      byDate.set(row.date, chooseDailyRecord(byDate.get(row.date), row, capturedAt));
    }
  }

  const recovered = normalizeUsage({ daily: [...byDate.values()] });
  const outPath = join(REPO_ROOT, file);
  writeFileSync(outPath, JSON.stringify(recovered, null, 2));
  console.log(`${file}: ${recovered.daily.length} days, $${recovered.totals.totalCost.toFixed(2)}`);
}

for (const file of listDataFiles()) recoverFile(file);
rebuildManifest();
