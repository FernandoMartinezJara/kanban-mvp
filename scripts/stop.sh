#!/usr/bin/env sh

set -e

echo "Stopping Project Management MVP..."

cd "$(dirname "$0")/.."

docker-compose down

echo "Application stopped."
