#!/usr/bin/env node
// Generates Chrome Web Store screenshots (1280x800) of JD Grab's own
// extension pages (options, popup).
//
// Usage: node scripts/generate-screenshots.mjs

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store-assets', 'screenshots');

async function shootExtensionPages() {
  // Options and popup need the extension actually loaded (chrome.storage,
  // chrome-extension:// origin), so use a persistent context instead of
  // the mocked fixture approach used for site screenshots.
  const userDataDir = path.join(ROOT, '.tmp-screenshot-profile');
  fs.rmSync(userDataDir, { recursive: true, force: true });

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // extensions require headed Chromium
    args: [
      `--disable-extensions-except=${ROOT}`,
      `--load-extension=${ROOT}`,
    ],
  });

  try {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    const extensionId = sw.url().split('/')[2];

    const optionsPage = await context.newPage();
    await optionsPage.setViewportSize({ width: 1280, height: 800 });
    await optionsPage.goto(`chrome-extension://${extensionId}/options.html`);
    await optionsPage.waitForTimeout(300);

    // The options page can be taller than the 800px canvas, which clips
    // content. Shrink it to fit within the canvas (never enlarge) and center.
    await optionsPage.evaluate(() => {
      const container = document.querySelector('.container');
      const rect = container.getBoundingClientRect();
      const scale = Math.min(1, 1280 / rect.width, 800 / rect.height);

      container.style.width = `${rect.width}px`;
      container.style.flexShrink = '0';

      document.body.style.margin = '0';
      document.body.style.width = '1280px';
      document.body.style.height = '800px';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';

      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = 'center';
    });
    await optionsPage.waitForTimeout(100);

    await optionsPage.screenshot({ path: path.join(OUT_DIR, 'options-page.png') });
    await optionsPage.close();

    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 1280, height: 800 });
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForTimeout(300);

    // Scale the popup content to fill 80% of the 1280x800 canvas, centered,
    // so it isn't a tiny box adrift in whitespace.
    await popupPage.evaluate(() => {
      const container = document.querySelector('.popup-container');
      const rect = container.getBoundingClientRect();
      const scale = Math.min((1280 * 0.8) / rect.width, (800 * 0.8) / rect.height);

      // Pin the container to its natural box before the body is resized, so
      // reflow doesn't change what gets scaled.
      container.style.width = `${rect.width}px`;
      container.style.flexShrink = '0';

      document.body.style.margin = '0';
      document.body.style.width = '1280px';
      document.body.style.height = '800px';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';

      container.style.transform = `scale(${scale})`;
      container.style.transformOrigin = 'center';
    });
    await popupPage.waitForTimeout(100);

    await popupPage.screenshot({ path: path.join(OUT_DIR, 'popup.png') });
    await popupPage.close();

    console.log(`saved ${path.join(OUT_DIR, 'options-page.png')}`);
    console.log(`saved ${path.join(OUT_DIR, 'popup.png')}`);
  } finally {
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await shootExtensionPages();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
