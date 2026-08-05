#!/usr/bin/env sh

set -e

echo "Building and starting the Project Management MVP..."

cd "$(dirname "$0")/.."

docker-compose up --build -d

echo "Application started at http://localhost:8000"
