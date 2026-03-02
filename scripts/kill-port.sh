#!/usr/bin/env bash
set -euo pipefail

# Prompt for a port (or take as first arg) and kill any process listening on it.
# Usage: ./scripts/kill-port.sh 3000

PORT=""
if [ "$#" -ge 1 ]; then
  PORT="$1"
else
  read -rp "Enter port to free: " PORT
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "Invalid port: $PORT" >&2
  exit 1
fi

# Try lsof (macOS / many Unixes)
PIDS=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)

if [ -z "$PIDS" ]; then
  echo "No process listening on port $PORT"
  exit 0
fi

echo "Killing process(es) on port $PORT: $PIDS"
echo "$PIDS" | xargs -r kill -9
echo "Done."
