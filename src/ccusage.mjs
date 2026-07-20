// Runs the locally-installed ccusage CLI and writes per-source usage JSON.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, EMPTY_USAGE } from "./config.mjs";

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
 * @param {string} deviceDir - absolute path to web/data/<device>/
 * @param {boolean} offline - use cached pricing instead of fetching
 * @returns {boolean} true if real data was written
 */
export function exportSource(source, deviceDir, offline = false) {
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
  if (res.status === 0 && out.startsWith("{")) {
    try {
      const data = JSON.parse(out);
      writeFileSync(join(deviceDir, `${source}.json`), JSON.stringify(data, null, 2));
      console.log(`    wrote ${source}.json (${data.daily?.length ?? 0} days)`);
      return true;
    } catch {
      console.log(`    ! invalid JSON for ${source}; writing empty`);
    }
  } else {
    console.log(`    (no data for ${source}, writing empty)`);
  }

  writeFileSync(join(deviceDir, `${source}.json`), JSON.stringify(EMPTY_USAGE, null, 2));
  return false;
}
