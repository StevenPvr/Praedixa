#!/usr/bin/env bash
set -euo pipefail

write_json_from_env() {
  local output_path="$1"
  shift
  python3 - "$output_path" "$@" <<'PY'
import json
import os
import sys

output_path = sys.argv[1]
keys = sys.argv[2:]
payload = {}
for key in keys:
    if key not in os.environ:
        continue
    value = os.environ[key]
    if value == "":
        continue
    payload[key] = value

with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(payload, handle, indent=2, sort_keys=True)
    handle.write("\n")
PY
}
