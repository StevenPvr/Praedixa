#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

app_dir="${1:?usage: run-next-standalone.sh <app-dir> <port>}"
port="${2:?usage: run-next-standalone.sh <app-dir> <port>}"
host="${HOSTNAME:-127.0.0.1}"

app_root="${ROOT_DIR}/${app_dir}"
standalone_root="${app_root}/.next/standalone/${app_dir}"
server_path="${standalone_root}/server.js"
static_source="${app_root}/.next/static"
static_target="${standalone_root}/.next/static"
public_source="${app_root}/public"
public_target="${standalone_root}/public"

if [[ ! -f "${server_path}" ]]; then
  echo "[run-next-standalone] Missing standalone server: ${server_path}" >&2
  echo "[run-next-standalone] Build ${app_dir} before starting the production runtime." >&2
  exit 1
fi

if [[ ! -d "${static_source}" ]]; then
  echo "[run-next-standalone] Missing static assets: ${static_source}" >&2
  echo "[run-next-standalone] Build ${app_dir} before starting the production runtime." >&2
  exit 1
fi

mkdir -p "$(dirname "${static_target}")"
rm -rf "${static_target}"
ln -s "${static_source}" "${static_target}"

if [[ -d "${public_source}" ]]; then
  rm -rf "${public_target}"
  ln -s "${public_source}" "${public_target}"
else
  mkdir -p "${public_target}"
fi

cd "${standalone_root}"
exec env HOSTNAME="${host}" PORT="${port}" node server.js
