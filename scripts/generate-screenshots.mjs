#!/usr/bin/env node
// Generates Chrome Web Store screenshots (1280x800) showing JD Grab's
// text-selection in action on each supported site's fixture page.
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

const SITES = [
  { name: 'linkedin', fixture: 'linkedin-job-page.html' },
  { name: 'indeed', fixture: 'indeed-job-dedicated-page.html' },
  { name: 'glassdoor', fixture: 'glassdoor-job-search.html' },
  { name: 'wellfound', fixture: 'wellfound-dedicated-job-page.html' },
  { name: 'welcome-to-the-jungle', fixture: 'wttj-dedicated-page.html' },
];

const CHROME_MOCK_SCRIPT = () => {
  class ChromeStorageMock {
    get(keys, callback) {
      callback({
        keyboardShortcut: {
          key: 'S',
          code: 'KeyS',
          altKey: true,
          ctrlKey: false,
          shiftKey: true,
          metaKey: false,
        },
      });
    }
  }

  window.chrome = {
    storage: {
      local: new ChromeStorageMock(),
      onChanged: { addListener: () => {} },
    },
    runtime: {},
  };
};

async function shootSite(browser, { name, fixture }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const htmlPath = path.join(ROOT, 'tests', 'fixtures', fixture);
  const html = fs.readFileSync(htmlPath, 'utf-8');
  await page.setContent(html);

  await page.addInitScript(CHROME_MOCK_SCRIPT);
  await page.addScriptTag({ path: path.join(ROOT, 'storage.js') });
  await page.addScriptTag({ path: path.join(ROOT, 'content.js') });
  await page.waitForTimeout(500);

  await page.keyboard.down('Alt');
  await page.keyboard.down('Shift');
  await page.keyboard.press('S');
  await page.keyboard.up('Shift');
  await page.keyboard.up('Alt');
  await page.waitForTimeout(200);

  const outPath = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: outPath });
  await page.close();

  console.log(`saved ${outPath}`);
}

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
    await optionsPage.screenshot({ path: path.join(OUT_DIR, 'options-page.png') });
    await optionsPage.close();

    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 1280, height: 800 });
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.waitForTimeout(300);
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
  const browser = await chromium.launch();
  try {
    for (const site of SITES) {
      await shootSite(browser, site);
    }
  } finally {
    await browser.close();
  }

  await shootExtensionPages();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
