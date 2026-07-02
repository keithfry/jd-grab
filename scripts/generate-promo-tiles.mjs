#!/usr/bin/env node
// Generates Chrome Web Store promo tiles (440x280 small, 1400x560 marquee)
// from an HTML template rendered via Playwright.
//
// Usage: node scripts/generate-promo-tiles.mjs

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store-assets', 'promo-tiles');
const ICON_PATH = path.join(ROOT, 'icons', 'icon128.png');

const TAGLINE = 'Select and copy job description text with one keystroke';
const SITES = 'LinkedIn · Indeed · Glassdoor · Wellfound · Welcome to the Jungle';

function iconDataUri() {
  const b64 = fs.readFileSync(ICON_PATH).toString('base64');
  return `data:image/png;base64,${b64}`;
}

const TILES = [
  {
    name: 'small-promo-tile',
    width: 440,
    height: 280,
    html: (icon) => `
      <div class="tile small">
        <img src="${icon}" class="icon" width="72" height="72" />
        <h1>JD Grab</h1>
        <p class="tagline">${TAGLINE}</p>
      </div>
    `,
  },
  {
    name: 'marquee-promo-tile',
    width: 1400,
    height: 560,
    html: (icon) => `
      <div class="tile marquee">
        <img src="${icon}" class="icon" width="140" height="140" />
        <div class="text">
          <h1>JD Grab</h1>
          <p class="tagline">${TAGLINE}</p>
          <p class="sites">${SITES}</p>
        </div>
      </div>
    `,
  },
];

const STYLE = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .tile {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #2b6cb0 0%, #1a365d 100%);
    color: #fff;
  }
  .tile.small {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  .tile.small .icon { margin-bottom: 4px; }
  .tile.small h1 { font-size: 32px; font-weight: 700; }
  .tile.small .tagline { font-size: 15px; padding: 0 24px; opacity: 0.9; line-height: 1.3; }

  .tile.marquee { gap: 48px; padding: 0 80px; }
  .tile.marquee .text { display: flex; flex-direction: column; gap: 14px; }
  .tile.marquee h1 { font-size: 56px; font-weight: 700; }
  .tile.marquee .tagline { font-size: 26px; opacity: 0.95; }
  .tile.marquee .sites { font-size: 18px; opacity: 0.75; }
`;

async function shootTile(browser, tile, icon) {
  const page = await browser.newPage({ viewport: { width: tile.width, height: tile.height } });
  await page.setContent(`<!doctype html><html><head><style>${STYLE}</style></head><body>${tile.html(icon)}</body></html>`);
  await page.waitForTimeout(100);
  const outPath = path.join(OUT_DIR, `${tile.name}.png`);
  await page.screenshot({ path: outPath });
  await page.close();
  console.log(`saved ${outPath}`);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const icon = iconDataUri();
  const browser = await chromium.launch();
  try {
    for (const tile of TILES) {
      await shootTile(browser, tile, icon);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
