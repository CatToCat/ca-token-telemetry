#!/bin/bash
# install-schedule-macos.sh
# Install a launchd job that runs `node src/collect.mjs` daily at 04:00.
#
# Usage: bash init/install-schedule-macos.sh

set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/com.user.catoken-telemetry.plist"
LABEL="com.user.catoken-telemetry"
LOG_DIR="$REPO_DIR/logs"
USER_NAME="$(id -un)"

NODE=$(command -v node)
if [ -z "$NODE" ]; then
  echo "Error: node not found in PATH" >&2
  exit 1
fi
PATH_VALUE="/usr/bin:/bin:/usr/sbin:/sbin:$(dirname "$NODE")"

COLLECT="$REPO_DIR/src/collect.mjs"
if [ ! -f "$COLLECT" ]; then
  echo "Error: $COLLECT not found" >&2
  exit 1
fi

mkdir -p "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NODE}</string>
        <string>${COLLECT}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${REPO_DIR}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>HOME</key>
        <string>${HOME}</string>
        <key>USER</key>
        <string>${USER_NAME}</string>
        <key>LOGNAME</key>
        <string>${USER_NAME}</string>
        <key>PATH</key>
        <string>${PATH_VALUE}</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>4</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>${LOG_DIR}/collect-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/collect-stderr.log</string>
    <key>RunAtLoad</key>
    <false/>
    <key>KeepAlive</key>
    <false/>
</dict>
</plist>
EOF

launchctl load "$PLIST_PATH"
echo "Created and loaded: $PLIST_PATH"
echo "Runs daily at 04:00."
echo ""
echo "Run immediately:  launchctl start $LABEL"
echo "Check status:     launchctl list $LABEL"
echo "Uninstall:        bash $(dirname "$0")/uninstall-schedule-macos.sh"
