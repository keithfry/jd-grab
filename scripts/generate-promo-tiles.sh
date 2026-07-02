#!/usr/bin/env bash
# Generates Chrome Web Store promo tiles (small 440x280, marquee 1400x560).
# Usage: ./scripts/generate-promo-tiles.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/generate-promo-tiles.mjs
