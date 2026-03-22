#!/bin/sh
set -eu

: "${BASIC_AUTH_USERNAME:?BASIC_AUTH_USERNAME is required}"
: "${BASIC_AUTH_PASSWORD:?BASIC_AUTH_PASSWORD is required}"

htpasswd -bcB /tmp/.htpasswd "$BASIC_AUTH_USERNAME" "$BASIC_AUTH_PASSWORD"

exec nginx -g 'daemon off;'
