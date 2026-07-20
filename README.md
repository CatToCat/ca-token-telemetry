# ca-token-telemetry

Multi-device dashboard for AI coding agent token usage & cost (OpenCode / Claude Code).
Each machine exports its local [ccusage](https://github.com/ccusage/ccusage) data
into `data/<device>/`; the static page merges everything into one view.

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
python -m http.server 8000    # macOS / Linux
py -m http.server 8000         # Windows
```

## Scheduled collect (daily)

Install a system scheduled task to run `npm run collect` every day at **04:00**,
so data is pushed automatically without manual intervention.

### Windows

```powershell
# Run as Administrator
powershell -ExecutionPolicy Bypass -File init\install-schedule-windows.ps1
```

Task name: `CATokenTelemetry-Collect`. Uninstall:

```powershell
powershell -ExecutionPolicy Bypass -File init\uninstall-schedule-windows.ps1
```

### macOS

```bash
bash init/install-schedule-macos.sh
```

This installs a `launchd` agent at:

```text
~/Library/LaunchAgents/com.user.catoken-telemetry.plist
```

Manually trigger one run:

```bash
launchctl start com.user.catoken-telemetry
```

Uninstall:

```bash
bash init/uninstall-schedule-macos.sh
```

## License

MIT License — see [LICENSE](LICENSE).
