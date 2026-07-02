# Right-Click Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native right-click "JD Grab" submenu exposing the three existing keyboard-shortcut actions on the five supported job sites.

**Architecture:** `background.js` registers a parent "JD Grab" menu with three children on `chrome.runtime.onInstalled`, scoped to the five supported sites via `documentUrlPatterns`. Menu clicks send a `runContextMenuAction` message to the active tab, where a new branch in `content.js`'s existing `chrome.runtime.onMessage` listener dispatches to the three already-existing action functions (`selectAboutTheJobSection`, `openJobTitleLink`, `openAndSelectInNewWindow`). No refactor of those functions is needed.

**Tech Stack:** Chrome Extension Manifest V3, vanilla JS, Playwright for integration tests.

**Design spec:** `docs/specs/2026-07-01-context-menu-design.md`

## Global Constraints

- Menu appears only on: `*://*.linkedin.com/*`, `*://*.wellfound.com/*`, `*://*.indeed.com/*`, `*://*.glassdoor.com/*`, `*://*.welcometothejungle.com/*` (must exactly match `content_scripts.matches` in `manifest.json`)
- All 3 menu items always shown (not gated on shortcut configuration)
- Menu item titles (exact copy): "Select Job Description", "Open Job Title in New Window/Tab", "Open Job Title & Select Description"
- Version bumps 1.5.1 → 1.6.0 in BOTH `manifest.json` and `package.json`
- Native context menus cannot be automated by Playwright — background.js registration/click-handling is verified manually; only the content.js dispatch branch gets automated tests

---

### Task 1: Content script message dispatch

**Files:**
- Modify: `content.js:428-434` (existing `chrome.runtime.onMessage` listener)
- Test: `tests/integration/context-menu-dispatch.spec.js` (new file)

**Interfaces:**
- Consumes: existing `content.js` functions `selectAboutTheJobSection()`, `openJobTitleLink()`, `openAndSelectInNewWindow()` (all zero-arg, already defined)
- Produces: content script handles message `{ action: 'runContextMenuAction', name: 'selectDescription' | 'openTitle' | 'openTitleAndSelect' }` — Task 2's background.js sends exactly this shape

- [ ] **Step 1: Write the failing test**

Create `tests/integration/context-menu-dispatch.spec.js`. Modeled on `tests/integration/indeed-dedicated-page.spec.js` (route-intercepted fixture so `window.location.hostname` is a real supported site, which `findJobTitleUrl()` requires). The chrome mock captures `onMessage` listeners and outbound `sendMessage` calls so the test can invoke the listener directly — simulating what background.js will do — and assert on the messages content.js sends back.

```js
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Context Menu Action Dispatch', () => {
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    const htmlPath = path.join(__dirname, '../fixtures/indeed-job-dedicated-page.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    // Intercept the Indeed URL and serve our fixture HTML
    await page.route('https://www.indeed.com/**', route => {
      route.fulfill({ body: html, contentType: 'text/html' });
    });

    // Inject chrome mock before navigation; capture onMessage listeners
    // and outbound sendMessage calls for assertions
    await page.addInitScript(() => {
      window.__messageListeners = [];
      window.__sentMessages = [];
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
        runtime: {
          onMessage: {
            addListener: (fn) => window.__messageListeners.push(fn)
          },
          sendMessage: (msg) => { window.__sentMessages.push(msg); }
        }
      };
    });

    await page.goto('https://www.indeed.com/viewjob?jk=abc123test');

    await page.addScriptTag({ path: path.join(__dirname, '../../storage.js') });
    await page.addScriptTag({ path: path.join(__dirname, '../../content.js') });
    await page.waitForTimeout(500);
  });

  test.afterEach(async () => {
    await page.close();
  });

  // Simulates background.js delivering a context-menu message
  async function dispatch(name) {
    await page.evaluate((actionName) => {
      window.__messageListeners.forEach((fn) =>
        fn({ action: 'runContextMenuAction', name: actionName })
      );
    }, name);
    await page.waitForTimeout(100);
  }

  test('selectDescription action selects the job description', async () => {
    await dispatch('selectDescription');

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toContain('About the Role');
  });

  test('openTitle action messages background to open the job URL', async () => {
    await dispatch('openTitle');

    const sent = await page.evaluate(() => window.__sentMessages);
    const openMsg = sent.find((m) => m.action === 'openWindow');
    expect(openMsg).toBeTruthy();
    expect(openMsg.url).toBe('https://www.indeed.com/viewjob?jk=abc123test');
  });

  test('openTitleAndSelect action messages background to open and select', async () => {
    await dispatch('openTitleAndSelect');

    const sent = await page.evaluate(() => window.__sentMessages);
    const openMsg = sent.find((m) => m.action === 'openWindowAndSelect');
    expect(openMsg).toBeTruthy();
    expect(openMsg.url).toBe('https://www.indeed.com/viewjob?jk=abc123test');
  });

  test('unknown action name is a silent no-op', async () => {
    await dispatch('bogusAction');

    const selectedText = await page.evaluate(() => window.getSelection().toString());
    expect(selectedText).toBe('');
    const sent = await page.evaluate(() => window.__sentMessages);
    expect(sent.filter((m) => m.action === 'openWindow')).toHaveLength(0);
    expect(sent.filter((m) => m.action === 'openWindowAndSelect')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/integration/context-menu-dispatch.spec.js`
Expected: 3 of 4 tests FAIL (`selectDescription`, `openTitle`, `openTitleAndSelect` — the message is ignored so nothing is selected/sent); `unknown action name` passes trivially.

- [ ] **Step 3: Add the dispatch branch to content.js**

In `content.js`, modify the existing listener (currently lines 428-434):

```js
// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'selectJobDescription') {
    debugLog('log', 'Received selectJobDescription from background — polling for content');
    waitForContentAndSelect();
  }

  if (message.action === 'runContextMenuAction') {
    debugLog('log', 'Received context menu action', message.name);
    if (message.name === 'selectDescription') selectAboutTheJobSection();
    if (message.name === 'openTitle') openJobTitleLink();
    if (message.name === 'openTitleAndSelect') openAndSelectInNewWindow();
  }
});
```

Only the `runContextMenuAction` block is new; the `selectJobDescription` block is unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/integration/context-menu-dispatch.spec.js`
Expected: 4 passed

- [ ] **Step 5: Run the full suite to check for regressions**

Run: `npm test`
Expected: all tests pass (75 existing + 4 new)

- [ ] **Step 6: Commit**

```bash
git add content.js tests/integration/context-menu-dispatch.spec.js
git commit -m "feat: dispatch context-menu actions in content script"
```

---

### Task 2: Menu registration and click handling in background.js

**Files:**
- Modify: `manifest.json:6` (permissions array)
- Modify: `background.js` (append to end of file)

**Interfaces:**
- Consumes: content.js message handler from Task 1 — sends `{ action: 'runContextMenuAction', name: <string> }` via `chrome.tabs.sendMessage`
- Produces: three context menu items with ids `select-description`, `open-title`, `open-title-and-select` under parent id `jd-grab`

No automated test — `chrome.contextMenus` is native browser UI outside Playwright's reach (see Global Constraints). Verification is manual in Step 3.

- [ ] **Step 1: Add contextMenus permission**

In `manifest.json`, change:

```json
"permissions": ["storage", "windows", "tabs"],
```

to:

```json
"permissions": ["storage", "windows", "tabs", "contextMenus"],
```

- [ ] **Step 2: Register menus and handle clicks**

Append to the end of `background.js`:

```js
// Context menu — same actions as the keyboard shortcuts.
// Patterns must match content_scripts.matches in manifest.json so the
// menu only appears where the content script is injected.
const SUPPORTED_SITE_PATTERNS = [
  '*://*.linkedin.com/*',
  '*://*.wellfound.com/*',
  '*://*.indeed.com/*',
  '*://*.glassdoor.com/*',
  '*://*.welcometothejungle.com/*',
];

const CONTEXT_MENU_ACTIONS = {
  'select-description': 'selectDescription',
  'open-title': 'openTitle',
  'open-title-and-select': 'openTitleAndSelect',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'jd-grab',
      title: 'JD Grab',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'select-description',
      parentId: 'jd-grab',
      title: 'Select Job Description',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'open-title',
      parentId: 'jd-grab',
      title: 'Open Job Title in New Window/Tab',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
    chrome.contextMenus.create({
      id: 'open-title-and-select',
      parentId: 'jd-grab',
      title: 'Open Job Title & Select Description',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_SITE_PATTERNS,
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const name = CONTEXT_MENU_ACTIONS[info.menuItemId];
  if (!name || !tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'runContextMenuAction', name })
    .catch(() => {
      console.warn('JD Grab: content script unavailable for context menu action');
    });
});
```

- [ ] **Step 3: Manual verification**

1. Open `chrome://extensions`, enable Developer mode, click the reload icon on JD Grab (or "Load unpacked" pointing at the repo root if not loaded). Reload is required — `onInstalled` only fires on install/update.
2. Open a LinkedIn job posting, right-click anywhere on the page. Expected: "JD Grab" submenu with the 3 items.
3. Click "Select Job Description". Expected: job description text becomes selected, same as pressing Alt+Shift+S.
4. Click "Open Job Title in New Window/Tab". Expected: job opens in a new window (or tab, per the options-page setting).
5. Click "Open Job Title & Select Description". Expected: job opens in a new window/tab and its description gets selected once loaded.
6. Right-click on a page on an unsupported site (e.g. google.com). Expected: no "JD Grab" menu entry.
7. Spot-check the menu appears on one other supported site (e.g. an Indeed job page).

- [ ] **Step 4: Run the full suite to check for regressions**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 5: Commit**

```bash
git add manifest.json background.js
git commit -m "feat: add right-click context menu for JD Grab actions"
```

---

### Task 3: Version bump and release prep

**Files:**
- Modify: `manifest.json:4` (`"version": "1.5.1"`)
- Modify: `package.json:3` (`"version": "1.5.1"`)
- Modify: `PREPARE_CHROME_STORE.md` (store-asset note)
- Modify: `store-assets/STORE_LISTING.md` (permission justification)

**Interfaces:**
- Consumes: completed feature from Tasks 1-2
- Produces: version 1.6.0 across both files; packaged zip

- [ ] **Step 1: Bump versions**

In `manifest.json`: `"version": "1.5.1"` → `"version": "1.6.0"`
In `package.json`: `"version": "1.5.1"` → `"version": "1.6.0"`

- [ ] **Step 2: Verify versions match**

Run: `grep '"version"' manifest.json package.json`
Expected: both lines show `1.6.0`

- [ ] **Step 3: Note the manual context-menu screenshot in the store checklist**

In `PREPARE_CHROME_STORE.md`, under the "Store Listing Requirements" screenshots item, add:

```markdown
  - [ ] Context-menu screenshot: capture manually (native OS menu — right-click a real job page with the "JD Grab" submenu open; not scriptable via Playwright)
```

- [ ] **Step 4: Add the contextMenus permission justification**

In `store-assets/STORE_LISTING.md`, add to the "Permission justifications" list (after the **windows** entry):

```markdown
- **contextMenus**: Adds a "JD Grab" right-click menu on the five supported
  job sites so users can trigger the same three actions available via
  keyboard shortcuts. The menu only appears on the supported sites.
```

- [ ] **Step 5: Rebuild the store zip**

Run: `./build.sh`
Expected: `Built build/jd-grab.zip` (zip now contains the 1.6.0 manifest with `contextMenus` permission)

- [ ] **Step 6: Run the full suite one final time**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add manifest.json package.json PREPARE_CHROME_STORE.md store-assets/STORE_LISTING.md
git commit -m "chore: bump version to 1.6.0 for context menu feature"
```
