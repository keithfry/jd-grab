import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('ZipRecruiter - Search Results Two-Pane Layout', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/ziprecruiter-search-panel.html');
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

    await page.goto('https://www.ziprecruiter.com/jobs-search?search=director+software+engineering&location=USA&refine_by_location_type=only_remote&lk=ultxSRuYz_5zz9rbaME7PQ');

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('selects the right-pane job description on keyboard shortcut', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());

    expect(selectedText).toContain('At Capital One, we are creating responsible and reliable AI systems');
    expect(selectedText).toContain('Lead and scale a high-performing engineering organization');
    expect(selectedText).toContain("Bachelor's degree in Computer Science");
  });

  test('does not select content outside the description pane', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).not.toContain('Content outside job card that should NOT be selected');
    expect(selectedText).not.toContain('What Capital One employees say');
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

  test('restores selection if it is cleared shortly after (e.g. by scroll-triggered re-render)', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const initial = await page.evaluate(() => window.getSelection().toString());
    expect(initial).toContain('At Capital One');

    await page.evaluate(() => window.getSelection().removeAllRanges());
    await page.waitForTimeout(250);

    const restored = await page.evaluate(() => window.getSelection().toString());
    expect(restored).toContain('At Capital One');
    expect(restored).toContain("Bachelor's degree in Computer Science");
  });

  test('restores selection onto a freshly re-rendered description node (hydration swap)', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    // Simulate the page's own React re-render replacing the description
    // element wholesale (e.g. hydration), not just clearing the selection.
    await page.evaluate(() => {
      window.getSelection().removeAllRanges();
      const headings = document.querySelectorAll('h2');
      let heading = null;
      for (const h of headings) {
        if (h.textContent.trim() === 'Job description') { heading = h; break; }
      }
      const oldEl = heading.nextElementSibling;
      const newEl = oldEl.cloneNode(true);
      oldEl.replaceWith(newEl);
    });

    await page.waitForTimeout(250);

    const restored = await page.evaluate(() => window.getSelection().toString());
    expect(restored).toContain('At Capital One');
    expect(restored).toContain("Bachelor's degree in Computer Science");
  });

  test('does not restore selection once typing in an input field', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    await page.evaluate(() => window.getSelection().removeAllRanges());
    await page.locator('#search-input').click();
    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
  });

  test('findJobTitleUrl returns the current search-panel URL (deep-links back to the selected job)', async () => {
    const url = await page.evaluate(() => {
      return window.JDGrab?.findJobTitleUrl?.() ?? null;
    });

    expect(url).toContain('ziprecruiter.com/jobs-search');
    expect(url).toContain('lk=ultxSRuYz_5zz9rbaME7PQ');
  });
});
