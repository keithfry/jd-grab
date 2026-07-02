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

# Extract the zip into build/extract/ so the built product can be loaded
# unpacked (chrome://extensions → Load unpacked) and tested as shipped.
EXTRACT_DIR="$BUILD_DIR/extract"
rm -rf "$EXTRACT_DIR"
mkdir -p "$EXTRACT_DIR"
unzip -q "$ZIP_PATH" -d "$EXTRACT_DIR"

echo
echo "Built build/jd-grab.zip"
echo "Extracted to build/extract/ (load unpacked from there to test)"
