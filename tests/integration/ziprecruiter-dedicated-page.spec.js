import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('ZipRecruiter - Dedicated Job Page', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/ziprecruiter-dedicated-job-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    await page.route('https://www.ziprecruiter.com/**', route => {
      route.fulfill({ body: html, contentType: 'text/html' });
    });

    await page.addInitScript(() => {
      window.chrome = {
        storage: {
          local: {
            get(keys, callback) {
              callback({
                keyboardShortcut: {
                  key: 'S', code: 'KeyS',
                  altKey: true, ctrlKey: false, shiftKey: true, metaKey: false
                }
              });
            }
          },
          onChanged: { addListener: () => {} }
        },
        runtime: { onMessage: { addListener: () => {} }, sendMessage: () => {} }
      };
    });

    await page.goto('https://www.ziprecruiter.com/c/Netflix/Job/Production-Supervisor/-in-Burbank,CA?jid=62f303069be82b5b');

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects job description on keyboard shortcut', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).toContain('Netflix Animation Studios');
    expect(selectedText).toContain('Create and update workflow documents');
    expect(selectedText).toContain('2+ years experience as a Production Supervisor');
  });

  test('does not select content outside the description or similar jobs section', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).not.toContain('Content outside job card that should NOT be selected');
    expect(selectedText).not.toContain('Similar Jobs');
  });

  test('ignores shortcut when typing in input field', async () => {
    await page.locator('#search-input').click();

    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
  });

  test('findJobTitleUrl returns current URL on dedicated page', async () => {
    const url = await page.evaluate(() => {
      return window.JDGrab?.findJobTitleUrl?.() ?? null;
    });

    expect(url).toContain('ziprecruiter.com');
    expect(url).toContain('/c/Netflix/Job/Production-Supervisor/');
  });
});
