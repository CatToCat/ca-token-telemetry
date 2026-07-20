# ca-token-telemetry

Multi-device dashboard for AI coding agent token usage & cost (OpenCode / Claude Code).
Each machine exports its local [ccusage](https://github.com/ccusage/ccusage) data
into `web/data/<device>/`; the static page merges everything into one view.

## Requirements

- Node.js >= 18
- Agents whose usage you want to track, already used locally so ccusage has data

## Install

```bash
npm install
```

This installs `ccusage` locally (declared in `package.json`), so the collector
does not depend on a global install.

## Collect usage data

Run the same command on every machine — it auto-detects the device by hostname
(see `DEVICE_BY_HOST` in `src/config.mjs`):

```bash
npm run collect                 # export + commit + pull --rebase + push
npm run collect -- --no-push    # commit only, don't push
npm run collect -- --no-git     # export files only
npm run collect -- --offline    # use cached pricing (no network)
npm run collect -- --device X   # force a device name (overrides hostname)
```

To add a new machine, print its hostname and add a mapping:

```bash
node -e "console.log(require('os').hostname())"
# then edit DEVICE_BY_HOST in src/config.mjs:
#   "<hostname>": "<device-name>"
```

## Run the dashboard locally

The page loads data via `fetch()`, so it must be served over HTTP:

```bash
npm run serve            # http://localhost:8000
```

Or with Python:

```bash
cd web && python -m http.server 8000    # macOS / Linux
cd web && py -m http.server 8000         # Windows
```

## Project layout

```
.
├── src/
│   ├── collect.mjs     # entry point: export → manifest → git
│   ├── config.mjs      # paths, sources, hostname → device mapping
│   ├── ccusage.mjs     # run ccusage, write per-source JSON
│   ├── manifest.mjs    # rebuild web/data/manifest.json
│   ├── git.mjs         # commit / rebase / push
│   └── util.mjs        # shared helpers (stamp)
└── web/                # static dashboard (fetches data at runtime)
    ├── index.html
    ├── vercel.json
    ├── assets/         # chart.js, icon
    └── data/           # manifest.json + <device>/{opencode,claude}.json
```
