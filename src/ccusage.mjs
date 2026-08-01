// Runs the locally-installed ccusage CLI and writes per-source usage JSON.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, EMPTY_USAGE } from "./config.mjs";
import { mergeUsage, normalizeUsage } from "./usage-ledger.mjs";
import { stamp } from "./util.mjs";

// Path to the ccusage executable installed as a dependency.
// Using the local bin avoids relying on a global install or network.
const CCUSAGE_BIN = join(
  REPO_ROOT,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "ccusage.cmd" : "ccusage",
);

/**
 * Export one ccusage source as full-history daily JSON into deviceDir.
 * Falls back to an empty payload if the source has no data or fails.
 * @param {string} source - ccusage source id, e.g. "opencode" | "claude"
 * @param {string} deviceDir - absolute path to data/<device>/
 * @param {boolean} offline - use cached pricing instead of fetching
 * @returns {boolean} true if real data was written
 */
export function exportSource(source, deviceDir, offline = false) {
  const outPath = join(deviceDir, `${source}.json`);
  let existing = EMPTY_USAGE;
  if (existsSync(outPath)) {
    try {
      existing = JSON.parse(readFileSync(outPath, "utf8"));
    } catch {
      console.log(`    ! existing ${source}.json is invalid; rebuilding from current snapshot`);
    }
  }

  const args = [source, "daily", "--json"];
  if (offline) args.push("--offline");

  // On Windows the ccusage launcher is a .cmd, which must run via a shell.
  // We pass a single quoted command string (args are fixed/safe) rather than
  // shell:true + args array, which Node deprecates.
  const isWin = process.platform === "win32";
  const res = isWin
    ? spawnSync(`"${CCUSAGE_BIN}" ${args.join(" ")}`, {
        encoding: "utf8",
        shell: true,
        maxBuffer: 32 * 1024 * 1024,
      })
    : spawnSync(CCUSAGE_BIN, args, {
        encoding: "utf8",
        maxBuffer: 32 * 1024 * 1024,
      });

  const out = (res.stdout || "").trim();
  const err = (res.stderr || "").trim();
  if (res.status === 0 && out.startsWith("{")) {
    try {
      const data = JSON.parse(out);
      const merged = mergeUsage(existing, data, stamp());
      writeFileSync(outPath, JSON.stringify(merged, null, 2));
      const addedDays = (merged.daily?.length ?? 0) - (normalizeUsage(existing).daily?.length ?? 0);
      console.log(
        `    wrote ${source}.json (${merged.daily?.length ?? 0} ledger days, ${data.daily?.length ?? 0} snapshot days, ${Math.max(0, addedDays)} new)`,
      );
      return true;
    } catch {
      console.log(`    ! invalid JSON for ${source}; writing empty`);
    }
  } else {
    console.log(`    (no data for ${source}, writing empty)`);
    if (res.status !== 0) console.log(`    ! ccusage exit status: ${res.status}`);
    if (err) console.log(`    ! stderr: ${err.split("\n")[0]}`);
    else if (out) console.log(`    ! stdout: ${out.split("\n")[0]}`);
  }

  const normalized = normalizeUsage(existing);
  writeFileSync(outPath, JSON.stringify(normalized, null, 2));
  return false;
}
