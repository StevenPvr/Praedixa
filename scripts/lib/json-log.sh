#!/usr/bin/env bash

json_log::_error() {
  echo "$1" >&2
  return "${2:-1}"
}

json_log::_validate_level() {
  case "$1" in
    debug | info | warn | error) ;;
    *)
      json_log::_error "json_log::emit received an unsupported level: $1" 2
      return
      ;;
  esac
}

json_log::_validate_event() {
  local value="$1"

  if [[ ! "$value" =~ ^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$ ]]; then
    json_log::_error \
      "json_log::emit received an invalid event: $value" \
      2
    return
  fi
}

json_log::_validate_name() {
  local label="$1"
  local value="$2"

  if [[ ! "$value" =~ ^[A-Za-z0-9._-]+$ ]]; then
    json_log::_error \
      "json_log::emit received an invalid ${label}: ${value:-<empty>}" \
      2
    return
  fi
}

json_log::_validate_message() {
  if [[ -z "$1" ]]; then
    json_log::_error "json_log::emit requires a non-empty message" 2
  fi
}

json_log::_validate_context_value() {
  local label="$1"
  local value="$2"

  if [[ -z "$value" ]]; then
    return 0
  fi

  if ((${#value} > 200)); then
    json_log::_error \
      "json_log::emit received ${label} longer than 200 characters" \
      2
    return
  fi

  if [[ ! "$value" =~ ^[A-Za-z0-9._:@/+:-]+$ ]]; then
    json_log::_error \
      "json_log::emit received a malformed ${label}: ${value}" \
      2
    return
  fi
}

json_log::_validate_extra_key() {
  local key="$1"

  if [[ ! "$key" =~ ^[a-z][a-z0-9_]*$ ]]; then
    json_log::_error \
      "json_log::emit received an invalid extra key: ${key:-<empty>}" \
      2
    return
  fi

  case "$key" in
    timestamp | level | event | message | script | service | env | request_id \
    | run_id | connector_run_id | action_id | contract_version | trace_id \
    | release_id)
      json_log::_error \
        "json_log::emit extra key collides with the canonical schema: $key" \
        2
      return
      ;;
  esac
}

json_log::_build_extras_json() {
  local extras_json='{}'
  local pair key value

  for pair in "$@"; do
    if [[ "$pair" != *=* ]]; then
      json_log::_error \
        "json_log::emit only accepts key=value extras (got '$pair')" \
        2
      return
    fi

    key="${pair%%=*}"
    value="${pair#*=}"
    json_log::_validate_extra_key "$key" || return

    extras_json="$(
      jq -cn \
        --argjson base "$extras_json" \
        --arg key "$key" \
        --arg value "$value" \
        '$base + { ($key): $value }'
    )" || return 1
  done

  printf '%s' "$extras_json"
}

json_log::emit() {
  if (($# < 3)); then
    echo "json_log::emit expects <level> <event> <message> [key=value ...]" >&2
    return 2
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "json_log::emit requires jq" >&2
    return 1
  fi

  local level="$1"
  local event="$2"
  local message="$3"
  shift 3

  local timestamp script_name service_name env_name request_id run_id
  local connector_run_id action_id contract_version trace_id release_id
  local extras_json

  timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  script_name="${SCRIPT_NAME:-$(basename "$0")}"
  service_name="${SCRIPT_SERVICE:-scripts}"
  env_name="${DEPLOY_ENV:-${ENV:-${NODE_ENV:-}}}"
  request_id="${REQUEST_ID:-${PRAEDIXA_REQUEST_ID:-}}"
  run_id="${RUN_ID:-${PRAEDIXA_RUN_ID:-}}"
  connector_run_id="${CONNECTOR_RUN_ID:-${PRAEDIXA_CONNECTOR_RUN_ID:-}}"
  action_id="${ACTION_ID:-${PRAEDIXA_ACTION_ID:-}}"
  contract_version="${CONTRACT_VERSION:-${PRAEDIXA_CONTRACT_VERSION:-}}"
  trace_id="${TRACE_ID:-${PRAEDIXA_TRACE_ID:-}}"
  release_id="${RELEASE_ID:-${PRAEDIXA_RELEASE_ID:-}}"

  json_log::_validate_level "$level" || return
  json_log::_validate_event "$event" || return
  json_log::_validate_message "$message" || return
  json_log::_validate_name "script" "$script_name" || return
  json_log::_validate_name "service" "$service_name" || return
  json_log::_validate_context_value "env" "$env_name" || return
  json_log::_validate_context_value "request_id" "$request_id" || return
  json_log::_validate_context_value "run_id" "$run_id" || return
  json_log::_validate_context_value "connector_run_id" "$connector_run_id" || return
  json_log::_validate_context_value "action_id" "$action_id" || return
  json_log::_validate_context_value "contract_version" "$contract_version" || return
  json_log::_validate_context_value "trace_id" "$trace_id" || return
  json_log::_validate_context_value "release_id" "$release_id" || return

  extras_json="$(json_log::_build_extras_json "$@")" || return

  jq -cn \
    --arg timestamp "$timestamp" \
    --arg level "$level" \
    --arg event "$event" \
    --arg message "$message" \
    --arg script "$script_name" \
    --arg service "$service_name" \
    --arg env "$env_name" \
    --arg request_id "$request_id" \
    --arg run_id "$run_id" \
    --arg connector_run_id "$connector_run_id" \
    --arg action_id "$action_id" \
    --arg contract_version "$contract_version" \
    --arg trace_id "$trace_id" \
    --arg release_id "$release_id" \
    --argjson extras "$extras_json" \
    '
      {
        timestamp: $timestamp,
        level: $level,
        event: $event,
        message: $message,
        script: $script,
        service: $service,
        env: ($env | if . == "" then null else . end),
        request_id: ($request_id | if . == "" then null else . end),
        run_id: ($run_id | if . == "" then null else . end),
        connector_run_id: ($connector_run_id | if . == "" then null else . end),
        action_id: ($action_id | if . == "" then null else . end),
        contract_version: ($contract_version | if . == "" then null else . end),
        trace_id: ($trace_id | if . == "" then null else . end),
        release_id: ($release_id | if . == "" then null else . end)
      } + $extras
    ' >&2
}
