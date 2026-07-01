#!/usr/bin/env bash
# Packages the extension into build/jd-grab.zip for Chrome Web Store submission.
#
# Usage: ./build.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$ROOT/build"
ZIP_PATH="$BUILD_DIR/jd-grab.zip"

INCLUDE=(
  manifest.json
  background.js
  content.js
  storage.js
  options.html
  options.css
  options.js
  popup.html
  popup.css
  popup.js
  icons
)

mkdir -p "$BUILD_DIR"
rm -f "$ZIP_PATH"

cd "$ROOT"
zip -r "$ZIP_PATH" "${INCLUDE[@]}" -x "*.DS_Store" -x "icons/icon.svg"

echo
echo "Built build/jd-grab.zip"
