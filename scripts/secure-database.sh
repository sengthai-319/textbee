#!/usr/bin/env bash
# Give the database a strong password, for new and existing installs.
#
#   scripts/secure-database.sh
#
# - Creates .env from .env.example if it is missing.
# - Generates MONGO_ROOT_PASS if it is empty.
# - If the database container already exists with the old default password
#   (adminPassword), changes it to the new one, so your data stays.
#
# Afterwards run: docker compose up -d --build
set -euo pipefail

cd "$(dirname "$0")/.."

[ -f .env ] || cp .env.example .env

current=$(grep -E '^MONGO_ROOT_PASS=' .env | head -1 | cut -d= -f2- || true)
user=$(grep -E '^MONGO_ROOT_USER=' .env | head -1 | cut -d= -f2- || true)
user=${user:-adminUser}

if [ -z "$current" ]; then
  # Hex only, so it can sit in a mongodb:// URL without escaping.
  current=$(openssl rand -hex 24)
  if grep -qE '^MONGO_ROOT_PASS=' .env; then
    # Portable in-place edit (macOS and Linux sed differ on -i).
    tmp=$(mktemp)
    sed "s|^MONGO_ROOT_PASS=.*|MONGO_ROOT_PASS=$current|" .env > "$tmp" && cat "$tmp" > .env && rm -f "$tmp"
  else
    printf 'MONGO_ROOT_PASS=%s\n' "$current" >> .env
  fi
  echo "Generated a database password in .env."
fi
chmod 600 .env

# An existing database keeps the password it was created with, whatever .env
# says now, so change it inside the running container.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qx textbee-db; then
  mongo() { docker exec textbee-db mongosh --quiet -u "$user" -p "$1" --authenticationDatabase admin --eval "$2"; }
  if mongo "$current" 'db.adminCommand({ ping: 1 }).ok' >/dev/null 2>&1; then
    echo "The database already uses the password in .env."
  else
    old=${OLD_MONGO_ROOT_PASS:-adminPassword}
    if mongo "$old" "db.getSiblingDB('admin').changeUserPassword('$user', '$current')" >/dev/null 2>&1; then
      echo "Changed the database password from the old one to the one in .env."
    else
      echo "Could not sign in to the database with the old password." >&2
      echo "If you had set a different one, run: OLD_MONGO_ROOT_PASS='<it>' $0" >&2
      exit 1
    fi
  fi
else
  echo "No running database found; the password in .env is used when it is created."
fi

echo "Next: docker compose up -d --build"
