import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('We Work Remotely - Dedicated Job Page', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/weworkremotely-dedicated-job-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    await page.route('https://weworkremotely.com/**', route => {
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

    await page.goto('https://weworkremotely.com/remote-jobs/coupa-software-sr-director-product-management-11051');

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

    expect(selectedText).toContain('Coupa makes margins multiply');
    expect(selectedText).toContain("Own the end-to-end growth strategy for Coupa's Supplier Network");
    expect(selectedText).toContain('The estimated pay range for this role is $208,000 - $270,000');
  });

  test('does not select content outside the description', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).not.toContain('Content outside job card that should NOT be selected');
    expect(selectedText).not.toContain('Related Jobs');
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

    expect(url).toContain('weworkremotely.com');
    expect(url).toContain('/remote-jobs/coupa-software-sr-director-product-management-11051');
  });
});
