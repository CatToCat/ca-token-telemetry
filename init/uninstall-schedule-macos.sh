#!/bin/bash
# uninstall-schedule-macos.sh
# Remove the launchd job for CA Token Telemetry.

set -euo pipefail

PLIST_PATH="$HOME/Library/LaunchAgents/com.user.catoken-telemetry.plist"
LABEL="com.user.catoken-telemetry"

if launchctl list "$LABEL" &>/dev/null; then
  launchctl unload "$PLIST_PATH"
  echo "Unloaded: $LABEL"
else
  echo "Job not loaded: $LABEL"
fi

if [ -f "$PLIST_PATH" ]; then
  rm "$PLIST_PATH"
  echo "Removed: $PLIST_PATH"
fi
