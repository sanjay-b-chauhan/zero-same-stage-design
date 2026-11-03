#!/bin/bash
# Run one short headless muted browser script. At most two run at once across all agents.
# usage: capture/shot.sh <url> <script.js> <shot dir> [1512,800]
# env DPR is not supported by the driver; use WIN only. Script API: await __shot('name'), sleep(ms), __e. Returns JSON.
DIR="$(cd "$(dirname "$0")" && pwd)"
L=/private/tmp/claude-501/-Users-sanjaychauhan-claudecode/854423fb-cbe8-45e7-b4d7-857c8bf6196f/scratchpad/locks
mkdir -p "$L"
slot=""
for i in $(seq 1 400); do
  for s in 1 2; do
    if mkdir "$L/$s" 2>/dev/null; then slot=$s; break 2; fi
    # a lock older than 4 minutes is a dead run
    if [ -d "$L/$s" ] && [ -n "$(find "$L/$s" -maxdepth 0 -mmin +4 2>/dev/null)" ]; then rmdir "$L/$s" 2>/dev/null; fi
  done
  sleep 1
done
[ -z "$slot" ] && { echo "no browser slot free"; exit 3; }
trap 'rmdir "$L/$slot" 2>/dev/null' EXIT
PORT=$((9360+slot)) UDD="$L/udd-$slot-$$" SHOT_DIR="$3" WIN="${4:-1512,800}" node "$DIR/drive2.mjs" "$1" "$2"
rc=$?
rm -rf "$L/udd-$slot-$$"
exit $rc
