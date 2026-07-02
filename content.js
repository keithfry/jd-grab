// Debug logging is defined in storage.js (loaded first)
// debugLog(level, message, data) is available

// IMMEDIATE LOG: Prove the script is loaded
debugLog('log', 'Content script loaded!', {
  url: window.location.href,
  readyState: document.readyState,
  timestamp: new Date().toISOString()
});

// Check if we're on Wellfound
function isWellfound() {
  return window.location.hostname.includes('wellfound.com');
}

// Check if we're on a Wellfound dedicated job page (e.g. /jobs/3991112-slug)
function isWellfoundDedicatedPage() {
  return isWellfound() && /^\/jobs\/\d+/.test(window.location.pathname);
}

// Check if we're on Indeed
function isIndeed() {
  return window.location.hostname === 'indeed.com' ||
         window.location.hostname.endsWith('.indeed.com');
}

// Check if we're on a dedicated Indeed job page (e.g. /viewjob?jk=...)
function isIndeedDedicatedPage() {
  return isIndeed() && window.location.pathname === '/viewjob';
}

// Check if we're on Glassdoor
function isGlassdoor() {
  return window.location.hostname.includes('glassdoor.com');
}

// Check if we're on a dedicated Glassdoor job page (e.g. /job-listing/...)
function isGlassdoorDedicatedPage() {
  return isGlassdoor() && window.location.pathname.includes('/job-listing/');
}

// Check if we're on Welcome to the Jungle
function isWelcomeToTheJungle() {
  return window.location.hostname.includes('welcometothejungle.com');
}

// Check if we're on a dedicated Welcome to the Jungle job page (e.g. /jobs/zMfP9vbb)
function isWelcomeToTheJungleDedicatedPage() {
  return isWelcomeToTheJungle() && /^\/jobs\//.test(window.location.pathname);
}

// Check if we're on Greenhouse (boards.greenhouse.io or job-boards.greenhouse.io)
function isGreenhouse() {
  return window.location.hostname.includes('greenhouse.io');
}

// Check if we're on a dedicated Greenhouse job page (e.g. /company/jobs/12345)
function isGreenhouseDedicatedPage() {
  return isGreenhouse() && /\/jobs\/\d+/.test(window.location.pathname);
}

// Check if we're on my.greenhouse.io (candidate job search/discovery portal,
// where jobs open in a modal instead of navigating to a dedicated URL)
function isGreenhouseMy() {
  return window.location.hostname === 'my.greenhouse.io';
}

// Check if a my.greenhouse.io job details modal is currently open
function isGreenhouseMyModalOpen() {
  return isGreenhouseMy() && !!document.querySelector('.application-description.body');
}

// Check if we're on Lever
function isLever() {
  return window.location.hostname.includes('lever.co');
}

// Check if we're on a dedicated Lever job page (e.g. /company/<uuid>)
function isLeverDedicatedPage() {
  return isLever() && /^\/[^/]+\/[0-9a-f-]{36}/.test(window.location.pathname);
}

// Check if we're on Ashby
function isAshby() {
  return window.location.hostname === 'jobs.ashbyhq.com';
}

// Check if we're on a dedicated Ashby job page (e.g. /company/<uuid>)
function isAshbyDedicatedPage() {
  return isAshby() && /^\/[^/]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(window.location.pathname);
}

// Check if we're on We Work Remotely
function isWeWorkRemotely() {
  return window.location.hostname.includes('weworkremotely.com');
}

// Check if we're on a dedicated WWR job page (e.g. /remote-jobs/<company-slug>)
function isWeWorkRemotelyDedicatedPage() {
  return isWeWorkRemotely() && !!document.querySelector('.lis-container__job__content__description');
}

// Check if we're on ZipRecruiter
function isZipRecruiter() {
  return window.location.hostname.includes('ziprecruiter.com');
}

// Check if we're on a dedicated ZipRecruiter job page (e.g. /c/Company/Job/Title/-in-City,ST)
function isZipRecruiterDedicatedPage() {
  return isZipRecruiter() && /^\/c\/[^/]+\/Job\//.test(window.location.pathname);
}

// Check if we're on the ZipRecruiter search-results two-pane layout
// (e.g. /jobs-search?...&lk=<jobKey>), where the selected job's description
// renders into a right-hand detail pane instead of a dedicated page
function isZipRecruiterSearchPanel() {
  return isZipRecruiter() && /^\/jobs-search/.test(window.location.pathname);
}

// True if either the dedicated page or the search-results panel currently
// has a job description loaded (job pages are dedicated by definition;
// the panel only "has" a job once the user clicks one from the list)
function isZipRecruiterJobPage() {
  return isZipRecruiterDedicatedPage() || isZipRecruiterSearchPanel();
}

// Find the "Job description" section heading, whose text is a stable,
// job-independent label (unlike the surrounding hashed/utility classes)
function findZipRecruiterDescriptionHeading() {
  const headings = document.querySelectorAll('h2');
  for (const heading of headings) {
    if (heading.textContent.trim() === 'Job description') return heading;
  }
  return null;
}

// Check if we're on a job page
function isJobPage() {
  if (isWellfound()) {
    return window.location.pathname.includes('/jobs');
  }
  if (isIndeed()) {
    const params = new URLSearchParams(window.location.search);
    return params.has('vjk') || window.location.pathname === '/viewjob';
  }
  if (isGlassdoor()) {
    return window.location.pathname.includes('/Job/') ||
           window.location.pathname.includes('/job-listing/');
  }
  if (isWelcomeToTheJungle()) {
    return /^\/jobs\//.test(window.location.pathname);
  }
  if (isGreenhouseMy()) {
    return isGreenhouseMyModalOpen();
  }
  if (isGreenhouse()) {
    return isGreenhouseDedicatedPage();
  }
  if (isLever()) {
    return isLeverDedicatedPage();
  }
  if (isAshby()) {
    return isAshbyDedicatedPage();
  }
  if (isZipRecruiter()) {
    return isZipRecruiterJobPage();
  }
  if (isWeWorkRemotely()) {
    return isWeWorkRemotelyDedicatedPage();
  }
  const url = window.location.href;
  return url.includes('/jobs/') || url.includes('/jobs?') || url.includes('/jobs#') || url.match(/\/jobs$/);
}

// Log page type
debugLog('log', 'Page type check', {
  isJobPage: isJobPage(),
  pathname: window.location.pathname
});

// State tracking for debugging
let listenerState = {
  registered: false,
  lastEventTime: null,
  registrationCount: 0
};

// Current keyboard shortcut (loaded from storage)
let currentShortcut = null;

// Current job title shortcut (loaded from storage)
let currentTitleShortcut = null;

// Current combined shortcut — opens title in new window then selects text (loaded from storage)
let currentCombinedShortcut = null;

// Whether to open in a new window ('window') or new tab ('tab')
let currentOpenTarget = 'window';

// Load keyboard shortcut from storage
async function initializeShortcut() {
  try {
    debugLog('log', 'Attempting to load shortcut from storage...');
    currentShortcut = await getShortcut();
    debugLog('log', 'Loaded shortcut', currentShortcut);
  } catch (error) {
    debugLog('error', 'Error loading shortcut, using default', error);
    currentShortcut = DEFAULT_SHORTCUT;
  }

  try {
    debugLog('log', 'Attempting to load title shortcut from storage...');
    currentTitleShortcut = await getTitleShortcut();
    debugLog('log', 'Loaded title shortcut', currentTitleShortcut);
  } catch (error) {
    debugLog('error', 'Error loading title shortcut, using default', error);
    currentTitleShortcut = DEFAULT_TITLE_SHORTCUT;
  }

  try {
    debugLog('log', 'Attempting to load combined shortcut from storage...');
    currentCombinedShortcut = await getCombinedShortcut();
    debugLog('log', 'Loaded combined shortcut', currentCombinedShortcut);
  } catch (error) {
    debugLog('error', 'Error loading combined shortcut, using default', error);
    currentCombinedShortcut = DEFAULT_COMBINED_SHORTCUT;
  }

  try {
    currentOpenTarget = await getOpenTarget();
    debugLog('log', 'Loaded open target', currentOpenTarget);
  } catch (error) {
    debugLog('error', 'Error loading open target, using default', error);
    currentOpenTarget = 'window';
  }
}

// Main keyboard handler function
function handleKeyboardShortcut(e) {
  const activeElement = document.activeElement;

  debugLog('log', 'Keyboard event received', {
    key: e.key,
    code: e.code,
    altKey: e.altKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    metaKey: e.metaKey,
    activeElement: activeElement?.tagName,
    activeElementId: activeElement?.id,
    activeElementClass: activeElement?.className,
    isContentEditable: activeElement?.isContentEditable
  });

  listenerState.lastEventTime = Date.now();

  // Safety check - ensure shortcut is loaded
  if (!currentShortcut) {
    debugLog('warn', 'Shortcut not yet loaded');
    return;
  }

  // Helper to test if an event matches a shortcut object
  function shortcutMatches(shortcut) {
    if (!shortcut) return false;
    return (
      e.key === shortcut.key || e.code === shortcut.code
    ) && (
      e.altKey === shortcut.altKey &&
      e.ctrlKey === shortcut.ctrlKey &&
      e.shiftKey === shortcut.shiftKey &&
      e.metaKey === shortcut.metaKey
    );
  }

  const matchesMain = shortcutMatches(currentShortcut);
  const matchesTitle = shortcutMatches(currentTitleShortcut);
  const matchesCombined = shortcutMatches(currentCombinedShortcut);

  if (matchesMain || matchesTitle || matchesCombined) {
    // Don't interfere if user is typing in input fields. Exception: a modifier
    // shortcut (Alt/Ctrl/Meta) can't insert a character, so it's safe to fire
    // even when focus is trapped inside a modal dialog (e.g. Greenhouse's job
    // details modal autofocuses its first form field on open).
    const hasModifier = e.altKey || e.ctrlKey || e.metaKey;
    const focusTrappedInModal = hasModifier && !!activeElement?.closest('[role="dialog"]');
    if (!focusTrappedInModal && activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      debugLog('log', 'Ignoring - user is in an editable field', {
        tag: activeElement.tagName,
        type: activeElement.type,
        id: activeElement.id,
        class: activeElement.className
      });
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (matchesCombined) {
      debugLog('log', 'Combined shortcut activated');
      openAndSelectInNewWindow();
    } else if (matchesMain) {
      debugLog('log', 'Main shortcut activated');
      selectAboutTheJobSection();
    } else {
      debugLog('log', 'Title shortcut activated');
      openJobTitleLink();
    }
  }
}

// Listener options (reuse for proper add/remove)
const listenerOptions = {
  capture: true,  // Critical: intercept before LinkedIn
  passive: false  // Allow preventDefault()
};

// Register keyboard listener with capturing phase
function registerKeyboardListener() {
  // Remove existing listeners to avoid duplicates (must use same options)
  document.removeEventListener('keydown', handleKeyboardShortcut, listenerOptions);
  window.removeEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  // Register in CAPTURE phase (runs before LinkedIn's bubble-phase handlers)
  document.addEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  // Redundant listener on window as fallback
  window.addEventListener('keydown', handleKeyboardShortcut, listenerOptions);

  listenerState.registered = true;
  listenerState.registrationCount++;

  debugLog('log', `Listeners registered (count: ${listenerState.registrationCount})`);
  debugLog('log', 'Current shortcut:', currentShortcut);
  debugLog('log', 'Testing listener... Press any key to verify');

  // Add a simple test listener to verify events are being captured
  const testListener = (e) => {
    debugLog('log', `TEST - Key event detected! ${e.key} ${e.code}`);
  };
  document.addEventListener('keydown', testListener, listenerOptions);

  // Remove test listener after 5 seconds
  setTimeout(() => {
    document.removeEventListener('keydown', testListener, listenerOptions);
    debugLog('log', 'Test listener removed');
  }, 5000);
}

// Main initialization function
async function initialize() {
  try {
    debugLog('log', 'Starting initialization...');

    // Verify storage.js is loaded
    if (typeof getShortcut === 'undefined') {
      debugLog('error', 'ERROR - storage.js not loaded! getShortcut is undefined');
      throw new Error('storage.js not loaded');
    }

    if (typeof DEFAULT_SHORTCUT === 'undefined') {
      debugLog('error', 'ERROR - DEFAULT_SHORTCUT is undefined');
      throw new Error('DEFAULT_SHORTCUT not defined');
    }

    debugLog('log', 'Dependencies verified, initializing...');

    // Ensure body is focusable and focused to receive keyboard events
    if (!document.body.hasAttribute('tabindex')) {
      document.body.setAttribute('tabindex', '-1');
      debugLog('log', 'Set body tabindex to -1 to enable keyboard event capture');
    }
    document.body.focus();
    debugLog('log', 'Focused document body to establish keyboard focus');

    await initializeShortcut();
    debugLog('log', 'Shortcut initialized, registering listener...');
    registerKeyboardListener();
    debugLog('log', 'Listener registration complete');

  } catch (error) {
    debugLog('error', 'Initialization failed', error);
    // Register with default shortcut as fallback
    currentShortcut = DEFAULT_SHORTCUT;
    registerKeyboardListener();
  }
}

// Initialize on load
initialize().catch((error) => {
  debugLog('error', 'FATAL ERROR during initialization', error);
});

// Handle SPA navigation (URL changes without page reload)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    debugLog('log', 'URL changed', {
      from: lastUrl,
      to: currentUrl,
      isJobPage: isJobPage(),
      activeElement: document.activeElement?.tagName,
      hasFocus: document.hasFocus()
    });
    lastUrl = currentUrl;

    // Re-initialize when navigating to a job page
    if (isJobPage()) {
      debugLog('log', 'Navigated to job page, re-initializing...', {
        activeElement: document.activeElement?.tagName,
        activeElementId: document.activeElement?.id,
        documentHasFocus: document.hasFocus()
      });

      // CRITICAL FIX: Ensure keyboard events can be captured by giving focus to the document
      // Without focus, keyboard events don't propagate through the DOM
      if (!document.hasFocus() || !document.activeElement || document.activeElement === document.body) {
        debugLog('log', 'Document has no focus - focusing body to enable keyboard events');
        // Focus the body to ensure keyboard events are dispatched
        document.body.focus();
        // Also set tabindex to make body focusable if needed
        if (!document.body.hasAttribute('tabindex')) {
          document.body.setAttribute('tabindex', '-1');
        }
      }

      // Re-register immediately
      debugLog('log', 'Re-registering listener immediately after navigation');
      registerKeyboardListener();

      // Also re-register after a delay to ensure page is stable
      setTimeout(() => {
        debugLog('log', 'Re-registering listener after navigation delay', {
          activeElement: document.activeElement?.tagName,
          documentHasFocus: document.hasFocus()
        });

        // Double-check focus again after delay
        if (!document.hasFocus() || document.activeElement === document.body) {
          debugLog('log', 'Still no focus after delay - forcing body focus again');
          document.body.focus();
        }

        registerKeyboardListener();
      }, 500); // Reduced delay - register again after 500ms
    }
  }
});

// Start observing URL changes
urlObserver.observe(document.body, {
  childList: true,
  subtree: true
});

debugLog('log', 'URL observer active');

// Add a permanent diagnostic listener to verify keyboard events are being captured
// This runs independently of our main handler
let lastDiagnosticLog = 0;
const diagnosticListener = (e) => {
  // Throttle to avoid spam (max once per second)
  const now = Date.now();
  if (now - lastDiagnosticLog < 1000) return;
  lastDiagnosticLog = now;

  debugLog('log', 'DIAGNOSTIC - Keydown event captured at document level', {
    key: e.key,
    code: e.code,
    target: e.target?.tagName,
    activeElement: document.activeElement?.tagName,
    documentHasFocus: document.hasFocus(),
    eventPhase: e.eventPhase,
    bubbles: e.bubbles
  });
};

document.addEventListener('keydown', diagnosticListener, { capture: true });
debugLog('log', 'Diagnostic listener active');

// Expose helper functions for debugging from console
window.JDGrab.checkStatus = function() {
  const status = {
    registered: listenerState.registered,
    registrationCount: listenerState.registrationCount,
    lastEventTime: listenerState.lastEventTime,
    isJobPage: isJobPage(),
    currentUrl: window.location.href,
    hasShortcut: currentShortcut !== null,
    shortcut: currentShortcut,
    activeElement: {
      tagName: document.activeElement?.tagName,
      id: document.activeElement?.id,
      className: document.activeElement?.className,
      isContentEditable: document.activeElement?.isContentEditable
    },
    documentHasFocus: document.hasFocus(),
    debugEnabled: window.JDGrab.debugEnabled
  };
  console.log('JD Grab Status:', status);
  return status;
};

window.JDGrab.forceReregister = function() {
  debugLog('log', 'Manual re-registration requested from console');
  registerKeyboardListener();
  console.log('Listeners re-registered. Try your shortcut now.');
};

debugLog('log', 'Helper functions exposed: JDGrab.checkStatus() and JDGrab.forceReregister()');

// Periodic health check
function startListenerHealthCheck() {
  setInterval(() => {
    debugLog('log', 'Health check', {
      registered: listenerState.registered,
      registrationCount: listenerState.registrationCount,
      lastEventTime: listenerState.lastEventTime,
      isJobPage: isJobPage(),
      currentUrl: window.location.href,
      hasShortcut: currentShortcut !== null,
      shortcut: currentShortcut
    });
  }, 30000); // Every 30 seconds
}

startListenerHealthCheck();

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

// Poll for job description content then select it (used after background opens a new tab/window)
function waitForContentAndSelect() {
  const maxWait = 20000;
  const pollInterval = 500;
  let elapsed = 0;

  const poll = setInterval(() => {
    elapsed += pollInterval;

    if (elapsed >= maxWait) {
      clearInterval(poll);
      debugLog('warn', 'Timed out waiting for job description content');
      return;
    }

    const contentReady = !!(
      document.querySelector('span[data-testid="expandable-text-box"]') ||
      document.querySelector('div.jobs-description__content') ||
      document.querySelector('div.jobs-description-content') ||
      document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]') ||
      document.querySelector('#job-description') ||
      document.querySelector('#jobDescriptionText') ||
      document.querySelector('[class*="JobDetails_jobDescription"]') ||
      document.querySelector('[data-testid="job-card-v2"]') ||
      document.querySelector('.job__description.body') ||
      document.querySelector('.application-description.body') ||
      document.querySelector('div[data-qa="job-description"]') ||
      document.querySelector('#overview') ||
      document.querySelector('.lis-container__job__content__description') ||
      !!findZipRecruiterDescriptionHeading()
    );

    if (contentReady) {
      clearInterval(poll);
      debugLog('log', 'Content ready — selecting job description');
      selectAboutTheJobSection();
    }
  }, pollInterval);
}

// Listen for shortcut changes from options page
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.keyboardShortcut) {
      debugLog('log', 'Shortcut changed', changes.keyboardShortcut.newValue);
      currentShortcut = changes.keyboardShortcut.newValue;
    }
    if (changes.titleShortcut) {
      debugLog('log', 'Title shortcut changed', changes.titleShortcut.newValue);
      currentTitleShortcut = changes.titleShortcut.newValue;
    }
    if (changes.combinedShortcut) {
      debugLog('log', 'Combined shortcut changed', changes.combinedShortcut.newValue);
      currentCombinedShortcut = changes.combinedShortcut.newValue;
    }
    if (changes.openTarget) {
      debugLog('log', 'Open target changed', changes.openTarget.newValue);
      currentOpenTarget = changes.openTarget.newValue;
    }
  }
});

function openAndSelectInNewWindow() {
  try {
    const url = findJobTitleUrl();
    if (!url) {
      debugLog('warn', 'Could not find job title URL for open-and-select');
      return;
    }
    debugLog('log', 'Requesting background to open and select', url);
    chrome.runtime.sendMessage({ action: 'openWindowAndSelect', url, target: currentOpenTarget });
  } catch (error) {
    debugLog('error', 'Error in openAndSelectInNewWindow', error);
  }
}

// Returns the URL to open for the job title link (site-agnostic)
function findJobTitleUrl() {
  if (isWellfound()) {
    // Dedicated page: already on the job page
    if (isWellfoundDedicatedPage()) {
      return window.location.href;
    }
    // Search panel: construct URL from job_listing_slug query param
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('job_listing_slug');
    if (slug) {
      return `https://wellfound.com/jobs/${slug}`;
    }
    debugLog('warn', 'Could not determine Wellfound job URL from query params');
    return null;
  }

  if (isIndeed()) {
    if (isIndeedDedicatedPage()) {
      return window.location.href;
    }
    const params = new URLSearchParams(window.location.search);
    const vjk = params.get('vjk');
    if (vjk) {
      return `https://${window.location.hostname}/viewjob?jk=${vjk}`;
    }
    debugLog('warn', 'Could not find Indeed job key in URL params');
    return null;
  }

  if (isGlassdoor()) {
    if (isGlassdoorDedicatedPage()) {
      return window.location.href;
    }
    const link = document.querySelector('a[href*="/job-listing/"]');
    if (link?.href) return link.href;
    debugLog('warn', 'Could not find Glassdoor job listing link');
    return null;
  }

  if (isWelcomeToTheJungle()) {
    if (isWelcomeToTheJungleDedicatedPage()) return window.location.href;
    debugLog('warn', 'Could not determine Welcome to the Jungle job URL');
    return null;
  }

  if (isGreenhouseMy()) {
    // The title link's target varies by company: some point at job-boards.greenhouse.io,
    // others at the company's own career page (which proxies the Greenhouse posting).
    const link = document.querySelector('.application-form-header--title')?.closest('a');
    if (link?.href) return link.href;
    debugLog('warn', 'Could not find Greenhouse job link in my.greenhouse.io modal');
    return null;
  }

  if (isGreenhouse()) {
    if (isGreenhouseDedicatedPage()) return window.location.href;
    debugLog('warn', 'Could not determine Greenhouse job URL');
    return null;
  }

  if (isLever()) {
    if (isLeverDedicatedPage()) return window.location.href;
    debugLog('warn', 'Could not determine Lever job URL');
    return null;
  }

  if (isAshby()) {
    if (isAshbyDedicatedPage()) return window.location.href;
    debugLog('warn', 'Could not determine Ashby job URL');
    return null;
  }

  if (isZipRecruiter()) {
    // Both layouts encode the selected job in the current URL: the dedicated
    // page IS the job URL, and the search panel reflects the selected job
    // via the `lk` query param, so the page URL deep-links back to it.
    if (isZipRecruiterJobPage()) return window.location.href;
    debugLog('warn', 'Could not determine ZipRecruiter job URL');
    return null;
  }

  if (isWeWorkRemotely()) {
    if (isWeWorkRemotelyDedicatedPage()) return window.location.href;
    debugLog('warn', 'Could not determine We Work Remotely job URL');
    return null;
  }

  // LinkedIn selectors
  const selectors = [
    '.job-details-jobs-unified-top-card__job-title h1 a[href*="/jobs/view/"]',
    '.jobs-unified-top-card__job-title h1 a[href*="/jobs/view/"]',
    '.job-details-jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
    '.jobs-unified-top-card__job-title a[href*="/jobs/view/"]',
    'a[data-tracking-control-name="public_jobs_topcard-title"]',
  ];
  for (const selector of selectors) {
    const link = document.querySelector(selector);
    if (link?.href) return link.href;
  }
  const fallback = document.querySelector('a[href*="/jobs/view/"]');
  return fallback?.href || null;
}

window.JDGrab.findJobTitleUrl = findJobTitleUrl;

function openJobTitleLink() {
  try {
    const url = findJobTitleUrl();
    if (!url) {
      debugLog('warn', 'Could not find job title URL');
      return;
    }
    debugLog('log', 'Requesting background to open title link', url);
    chrome.runtime.sendMessage({ action: 'openWindow', url, target: currentOpenTarget });
  } catch (error) {
    debugLog('error', 'Error opening job title link', error);
  }
}

function selectWellfoundDescription() {
  try {
    // Type 2 (dedicated page): [data-test="JobDetail"] [class*="styles_description__"]
    // Type 1 (search panel): #job-description
    const el = document.querySelector('[data-test="JobDetail"] [class*="styles_description__"]')
      || document.querySelector('#job-description');

    if (!el) {
      debugLog('warn', 'Could not find Wellfound job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Wellfound description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Wellfound description', error);
  }
}

function selectGlassdoorDescription() {
  try {
    const el = document.querySelector('[class*="JobDetails_jobDescription"]');
    if (!el) {
      debugLog('warn', 'Could not find Glassdoor job description element');
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Glassdoor description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Glassdoor description', error);
  }
}

function selectIndeedDescription() {
  try {
    const el = document.querySelector('#jobDescriptionText');

    if (!el) {
      debugLog('warn', 'Could not find Indeed job description element (#jobDescriptionText)');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    const heading = document.querySelector('#jobDescriptionTitleHeading');
    if (heading) {
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    debugLog('log', 'Indeed description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Indeed description', error);
  }
}

function selectWelcomeToTheJungleDescription() {
  try {
    const el = document.querySelector('[data-testid="job-card-v2"]');

    if (!el) {
      debugLog('warn', 'Could not find Welcome to the Jungle job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Welcome to the Jungle description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Welcome to the Jungle description', error);
  }
}

function selectGreenhouseDescription() {
  try {
    const el = document.querySelector('.job__description.body')
      || document.querySelector('#content');

    if (!el) {
      debugLog('warn', 'Could not find Greenhouse job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Greenhouse description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Greenhouse description', error);
  }
}

function selectGreenhouseMyDescription() {
  try {
    const el = document.querySelector('.application-description.body');

    if (!el) {
      debugLog('warn', 'Could not find my.greenhouse.io job description element (modal not open?)');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'my.greenhouse.io description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting my.greenhouse.io description', error);
  }
}

function selectLeverDescription() {
  try {
    const el = document.querySelector('div[data-qa="job-description"]')?.closest('.section-wrapper.page-full-width')
      || document.querySelector('div.section-wrapper.page-full-width:not(.accent-section)');

    if (!el) {
      debugLog('warn', 'Could not find Lever job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Lever description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Lever description', error);
  }
}

function selectAshbyDescription() {
  try {
    const overview = document.querySelector('#overview');
    const el = overview?.querySelector('[class*="_descriptionText_"]') || overview;

    if (!el) {
      debugLog('warn', 'Could not find Ashby job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'Ashby description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting Ashby description', error);
  }
}

function selectZipRecruiterDescription() {
  try {
    const heading = findZipRecruiterDescriptionHeading();
    const el = heading?.nextElementSibling;

    if (!el) {
      debugLog('warn', 'Could not find ZipRecruiter job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    // 'auto' (not 'smooth') so the scroll completes immediately rather than
    // animating — a smooth scroll leaves an async window during which
    // ZipRecruiter's own scroll-linked re-renders (rating widget, or a
    // freshly hydrating page from the open-and-select flow) can clear the
    // selection before it settles.
    el.scrollIntoView({ behavior: 'auto', block: 'start' });
    debugLog('log', 'ZipRecruiter description selected successfully');
    guardZipRecruiterSelection(el);
  } catch (error) {
    debugLog('error', 'Error selecting ZipRecruiter description', error);
  }
}

// ZipRecruiter's company-rating widget (Breakroom quiz progress bar, hover
// tooltips) sits directly above the job description and re-renders on
// scroll. That re-render clears the browser's Selection object even though
// the description's DOM nodes are untouched — so scrolling up through the
// rating section drops the selection. Separately, a freshly opened tab
// (open-and-select flow) may still be hydrating, which can swap out the
// description element entirely rather than just clearing the selection.
// Watch for both cases (an emptied selection, user not actively typing
// elsewhere) and silently restore it, re-locating the element if the
// original node was replaced.
// Polls rather than listening for 'selectionchange': if the page clears the
// selection synchronously (e.g. during our own scrollIntoView call, before
// a freshly-attached listener could ever see it), an event-driven guard
// misses that first clearing entirely and never recovers. Polling checks
// immediately on setup and repeatedly afterward, so there's no such gap.
let zipRecruiterSelectionGuardInterval = null;
function guardZipRecruiterSelection(el, timeoutMs = 4000, intervalMs = 150) {
  if (zipRecruiterSelectionGuardInterval) {
    clearInterval(zipRecruiterSelectionGuardInterval);
    zipRecruiterSelectionGuardInterval = null;
  }

  const deadline = Date.now() + timeoutMs;

  function check() {
    if (Date.now() > deadline) {
      clearInterval(zipRecruiterSelectionGuardInterval);
      zipRecruiterSelectionGuardInterval = null;
      return;
    }

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) return;

    if (!el.isConnected) {
      const heading = findZipRecruiterDescriptionHeading();
      const freshEl = heading?.nextElementSibling;
      if (!freshEl) return;
      el = freshEl;
    }

    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) return;

    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
    debugLog('log', 'Restored ZipRecruiter description selection after scroll cleared it');
  }

  check();
  zipRecruiterSelectionGuardInterval = setInterval(check, intervalMs);
}

function selectWeWorkRemotelyDescription() {
  try {
    const el = document.querySelector('.lis-container__job__content__description');

    if (!el) {
      debugLog('warn', 'Could not find We Work Remotely job description element');
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    debugLog('log', 'We Work Remotely description selected successfully');
  } catch (error) {
    debugLog('error', 'Error selecting We Work Remotely description', error);
  }
}

function selectAboutTheJobSection() {
  try {
    if (isZipRecruiter()) {
      selectZipRecruiterDescription();
      return;
    }

    if (isWeWorkRemotely()) {
      selectWeWorkRemotelyDescription();
      return;
    }

    if (isAshby()) {
      selectAshbyDescription();
      return;
    }

    if (isWelcomeToTheJungle()) {
      selectWelcomeToTheJungleDescription();
      return;
    }

    if (isGreenhouseMy()) {
      selectGreenhouseMyDescription();
      return;
    }

    if (isGreenhouse()) {
      selectGreenhouseDescription();
      return;
    }

    if (isLever()) {
      selectLeverDescription();
      return;
    }

    if (isWellfound()) {
      selectWellfoundDescription();
      return;
    }

    if (isIndeed()) {
      selectIndeedDescription();
      return;
    }

    if (isGlassdoor()) {
      selectGlassdoorDescription();
      return;
    }

    // Find the "About the job" h2 heading
    const headings = document.querySelectorAll('h2');
    let aboutJobHeading = null;

    for (const heading of headings) {
      if (heading.textContent.trim() === 'About the job') {
        aboutJobHeading = heading;
        break;
      }
    }

    // Find the expandable text box span (the actual content)
    const contentSpan = document.querySelector('span[data-testid="expandable-text-box"]');

    // Try primary method: using heading and expandable text box
    if (aboutJobHeading && contentSpan) {
      // Look for the hr separator that marks the end of the section
      const hrSeparator = contentSpan.parentElement.querySelector('hr');

      // Create a range for the selection
      const range = document.createRange();

      // Start from the beginning of the content span
      range.setStartBefore(contentSpan.firstChild || contentSpan);

      // End at the hr separator if it exists, otherwise end of content span
      if (hrSeparator) {
        range.setEndBefore(hrSeparator);
      } else {
        range.setEndAfter(contentSpan.lastChild || contentSpan);
      }

      // Apply the selection (window must be focused for selection to stick)
      window.focus();
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Scroll to the top of the selected content
      aboutJobHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });

      debugLog('log', 'Text selected successfully (primary method)');
      return;
    }

    // Fallback method: look for jobs-description content divs
    debugLog('log', 'Trying fallback method...');

    const descriptionDiv = document.querySelector('div.jobs-description__content, div.jobs-description-content');

    if (!descriptionDiv) {
      debugLog('warn', 'Could not find job description content with either method');
      return;
    }

    // Create a range for the entire description div
    const range = document.createRange();
    range.selectNodeContents(descriptionDiv);

    // Apply the selection (window must be focused for selection to stick)
    window.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    // Scroll to the selected content
    descriptionDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

    debugLog('log', 'Text selected successfully (fallback method)');

  } catch (error) {
    debugLog('error', 'Error selecting text', error);
  }
}

