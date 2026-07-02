---
title: Changelog
layout: default
permalink: /changelog/
---

# Changelog

## 1.8.0 (pending release)

- **New sites:** Greenhouse (dedicated job-boards pages and the
  `my.greenhouse.io` candidate-portal modal), Lever, Ashby, ZipRecruiter
  (dedicated job pages and the search-results two-pane layout), We Work
  Remotely.
- **Known limitation:** on `my.greenhouse.io`, "open job title in new
  tab/window" opens whatever URL the posting links to. Some companies link
  to `job-boards.greenhouse.io` (works normally); others link to a custom
  company career page with no consistent layout, so text-selection isn't
  guaranteed there — only the link itself is reliable. Selecting the
  description inside the `my.greenhouse.io` modal always works.
- Fix: the right-click "JD Grab" context menu now appears when right-clicking
  a text selection or a link, not just empty page space.

## 1.6.0

- **New:** right-click "JD Grab" context menu — all keyboard-shortcut actions
  are now also available by right-clicking the page.
- Rebranded from "LinkedIn Job Quick Select" to "JD Grab", with new icons.
- Fix: ensure the window has focus before selecting text, across all sites.

## 1.5.0

- **New sites:** Glassdoor, Welcome to the Jungle.

## 1.4.0

- **New site:** Indeed.

## 1.3.0

- **New site:** Wellfound.
- **New:** "open job title in new tab/window" shortcut, and a combined
  open-and-select shortcut.
- Fix: keyboard shortcut no longer stops working after single-page-app
  navigation between job postings.
- Debug logging is now disabled by default.

## 1.2.0

- **New:** customizable keyboard shortcuts (previously fixed).

## 1.1.0

- Fix: intermittent keyboard shortcut failures.
- **New:** fallback selection method for job descriptions when the primary
  selector doesn't match.

## 1.0.0

- Initial release: select and copy the job description on LinkedIn with a
  keyboard shortcut.
