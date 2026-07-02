# Chrome Web Store Listing — JD Grab

## Short description (≤132 chars)
Select and copy job description text on LinkedIn, Indeed, Glassdoor, Wellfound, and Welcome to the Jungle with one keystroke.

(117 chars)

## Detailed description

JD Grab lets you instantly select job description text on the job sites you
already use, so you can copy it into notes, resumes, or an ATS with a single
keyboard shortcut — no more manually dragging to highlight text.

**Supported sites**
- LinkedIn
- Indeed
- Glassdoor
- Wellfound
- Welcome to the Jungle

**Features**
- Customizable keyboard shortcut (default: Option/Alt + Shift + S)
- Smart detection of the job description section on each site
- Automatically scrolls the description into view and selects it
- Works as you navigate between job postings in single-page apps
- Multiple fallback strategies for reliable selection across site layouts
- No data collection — all settings stay on your device

**How it works**
1. Open any job posting on a supported site
2. Press your shortcut
3. The job description is selected and scrolled into view
4. Copy it with Ctrl+C / Cmd+C

Configure your shortcut anytime from the extension's Options page.

## Category
Productivity

## Support / contact email
keithfry@gmail.com

## Permission justifications (for CWS review form)

- **storage**: Used to save the user's custom keyboard shortcut preferences
  locally via `chrome.storage.local`. No data leaves the device.
- **tabs**: Used to read the active tab's URL to confirm the user is on a
  supported job site before acting, and to support the configured
  "open in new tab" behavior for shortcuts.
- **windows**: Used to ensure the browser window has focus before performing
  text selection, which is required for selection to work reliably across
  different site layouts.
- **Host permissions** (linkedin.com, indeed.com, glassdoor.com,
  wellfound.com, welcometothejungle.com): Required to inject the content
  script that locates and selects the job description text on these five
  specific sites. No other sites are accessed.

## Data usage disclosure (CWS dashboard form)
- Does this extension collect user data? **No**
- Justification: JD Grab makes no network requests and only stores keyboard
  shortcut preferences locally via `chrome.storage.local`. See
  `PRIVACY_POLICY.md`.
