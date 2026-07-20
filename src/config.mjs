// Project-wide configuration: paths, data sources, and device identity.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import os from "node:os";

// Repo root is the parent of src/.
export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Static site lives in web/; data is served from web/data/<device>/.
export const WEB_DIR = join(REPO_ROOT, "web");
export const DATA_DIR = join(WEB_DIR, "data");

// ccusage sources to collect on every run.
export const SOURCES = ["opencode", "claude"];

// Map each machine's hostname -> device folder name.
// Find a machine's hostname with:  node -e "console.log(require('os').hostname())"
export const DEVICE_BY_HOST = {
  Elias: "r5-2600-gtx1660", // Windows desktop (Ryzen 5 2600 + GTX 1660)
  "MacBookPro.lan": "m1pro-32gb", // MacBook Pro 2021 (M1 Pro, 32GB)
  MacBookPro: "m1pro-32gb", // same Mac, in case hostname has no .lan suffix
};

// Empty payload written when a source has no local usage data.
export const EMPTY_USAGE = {
  daily: [],
  totals: {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalCost: 0,
  },
};

/**
 * Resolve this machine's device name.
 * @param {string|null} forced - explicit device name (overrides hostname map)
 * @returns {string|null} device name, or null if the host is unknown
 */
export function resolveDevice(forced = null) {
  if (forced) return forced;
  const host = os.hostname();
  const device = DEVICE_BY_HOST[host];
  if (device) return device;
  console.log(`==> Unknown host '${host}'.`);
  console.log("    Add it to DEVICE_BY_HOST in src/config.mjs, or pass --device NAME.");
  return null;
}
