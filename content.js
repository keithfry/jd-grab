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
    // Don't interfere if user is typing in input fields
    if (activeElement && (
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
window.LinkedInJobQuickSelect.checkStatus = function() {
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
    debugEnabled: window.LinkedInJobQuickSelect.debugEnabled
  };
  console.log('LinkedIn Job Quick Select Status:', status);
  return status;
};

window.LinkedInJobQuickSelect.forceReregister = function() {
  debugLog('log', 'Manual re-registration requested from console');
  registerKeyboardListener();
  console.log('Listeners re-registered. Try your shortcut now.');
};

debugLog('log', 'Helper functions exposed: LinkedInJobQuickSelect.checkStatus() and LinkedInJobQuickSelect.forceReregister()');

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
      document.querySelector('[data-testid="job-card-v2"]')
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

window.LinkedInJobQuickSelect.findJobTitleUrl = findJobTitleUrl;

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

function selectAboutTheJobSection() {
  try {
    if (isWelcomeToTheJungle()) {
      selectWelcomeToTheJungleDescription();
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

