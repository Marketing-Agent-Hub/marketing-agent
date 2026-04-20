#!/bin/bash

set -euo pipefail

TAG="${1:-latest}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

cd "$REPO_ROOT"

echo "Deploying Marketing Agent with tag: $TAG"

export IMAGE_TAG="$TAG"
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml ps

