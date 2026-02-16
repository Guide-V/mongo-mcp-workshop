#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# seed.sh – Generate POS data directly into MongoDB via mongosh
# ---------------------------------------------------------------------------
set -euo pipefail

MONGO_URI="${MONGODB_URI:-mongodb://mongodb:27017/pos?replicaSet=rs0}"
SEED_DIR="/seed"

echo "Waiting for MongoDB to accept connections..."
until mongosh "${MONGO_URI}" --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null; do
  sleep 2
done

echo "Running seed script..."
mongosh "${MONGO_URI}" "${SEED_DIR}/seed.js"
