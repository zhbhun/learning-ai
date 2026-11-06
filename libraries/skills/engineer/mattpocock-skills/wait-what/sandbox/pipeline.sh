#!/bin/sh
# Usage: ./pipeline.sh <target>   (targets: staging, prod)
set -e
TARGET=${1:?usage: ./pipeline.sh <target>}
echo "[1/3] building artifact from src/ ..."
tar czf app.tgz src
echo "[2/3] promoting artifact to $TARGET ..."
mkdir -p "deploy/$TARGET"
cp app.tgz "deploy/$TARGET/app.tgz"
echo "[3/3] done. $TARGET is live with the new artifact."
