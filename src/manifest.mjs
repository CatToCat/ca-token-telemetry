// Rebuilds data/manifest.json by scanning device folders.
// The static page reads this to know which devices/sources exist.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR } from "./config.mjs";
import { stamp } from "./util.mjs";

/**
 * Scan DATA_DIR for <device>/*.json and write manifest.json:
 * { generated, devices: [{ id, sources, updated }] }
 */
export function rebuildManifest() {
  const devices = [];

  for (const entry of readdirSync(DATA_DIR).sort()) {
    const dir = join(DATA_DIR, entry);
    if (!statSync(dir).isDirectory()) continue;

    const sources = [];
    let latest = 0;
    for (const file of readdirSync(dir).sort()) {
      if (!file.endsWith(".json")) continue;
      sources.push(file.replace(/\.json$/, ""));
      latest = Math.max(latest, statSync(join(dir, file)).mtimeMs);
    }
    if (sources.length) {
      devices.push({ id: entry, sources, updated: stamp(new Date(latest)) });
    }
  }

  const manifest = { generated: stamp(), devices };
  writeFileSync(join(DATA_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(
    "    manifest:",
    devices.map((d) => d.id).join(", ") || "(none)",
  );
}
