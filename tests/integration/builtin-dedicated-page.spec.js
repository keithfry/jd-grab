import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Built In - Dedicated Job Page', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/builtin-dedicated-job-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    await page.route('https://builtin.com/**', route => {
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

    await page.goto('https://builtin.com/job/software-engineer-advanced-reporting/10375663');

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

    expect(selectedText).toContain('Klaviyo brings to our workplace');
    expect(selectedText).toContain('How you will make a difference:');
    expect(selectedText).toContain('Design and build advanced reporting features');
    expect(selectedText).toContain('Skills Required');
    expect(selectedText).toContain('5+ years of full-stack software engineering experience');
  });

  test('does not select "What the Team is Saying" or content outside the job card', async () => {
    await page.keyboard.down('Alt');
    await page.keyboard.down('Shift');
    await page.keyboard.press('S');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Alt');

    await page.waitForTimeout(100);

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).not.toContain('What the Team is Saying');
    expect(selectedText).not.toContain('Content outside job card that should NOT be selected');
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

    expect(url).toContain('builtin.com');
    expect(url).toContain('/job/software-engineer-advanced-reporting/10375663');
  });
});
