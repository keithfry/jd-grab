# Chrome Web Store Publishing Checklist — JD Grab

> API credentials + refresh-token expiry fix for the automated deploy workflow: see `docs/chrome-store-credentials.md`

## Rebrand (done)
- [x] manifest.json name → "JD Grab"
- [x] package.json name/description → JD Grab
- [x] README.md title/description → JD Grab
- [x] Icons generated (16/32/48/128 + svg source)
- [x] Committed (1fa9670 rebrand: rename extension to JD Grab, add icons)

## Store Listing Requirements
- [x] Privacy policy content drafted (`PRIVACY_POLICY.md`) — [x] published at https://keithfry.github.io/jd-grab/privacy-policy/ (auto-deployed by `.github/workflows/pages.yml`)
- [x] Short description (≤132 chars) — drafted in `STORE_LISTING.md`
- [x] Detailed description (store listing body) — drafted in `STORE_LISTING.md`
- [x] Category selection — Productivity
- [x] Support/contact email — frybynitesw@gmail.com
- [x] Screenshots: auto-generated via `npm run screenshots` (`scripts/generate-screenshots.mjs` → `store-assets/screenshots/`):
  - `options-page.png` — real extension options UI (loaded via persistent context, `chrome-extension://` origin)
  - `popup.png` — real extension popup UI, cropped to the popup's natural size
  - Note: the toolbar icon click itself (native Chrome browser chrome) can't be captured by Playwright — only the popup's own content, which is what matters for the store listing
  - [ ] Context-menu screenshot: capture manually (native OS menu — right-click a real job page with the "JD Grab" submenu open; not scriptable via Playwright)
- [x] Small promo tile: 440x280 — auto-generated via `npm run promo-tiles` (`scripts/generate-promo-tiles.mjs`/`.sh` → `store-assets/promo-tiles/`)
- [x] Marquee promo tile: 1400x560 (optional, needed for featured placement) — same script
- [ ] Store icon: 128x128 (already have `icons/icon128.png` — verify meets store quality bar)

## Manifest / Packaging
- [ ] Bump version if needed before first submission
- [x] Confirm `permissions` justified (storage, windows, tabs) — justification text drafted in `STORE_LISTING.md`
- [x] Confirm host permissions list matches only the 5 supported sites (verified in `manifest.json`)
- [ ] Remove any dev-only files from package (test-results/, playwright-report/, test-output.log, docs/, node_modules/, .git/) before zipping
- [ ] Zip extension directory (manifest.json at zip root)

## Developer Account
- [ ] Chrome Web Store developer account created ($5 one-time registration fee if not already paid)
- [ ] Verify publisher name/identity settings

## Review Prep
- [ ] Test packed .zip by loading unpacked build fresh (not dev folder) to confirm nothing missing
- [x] Run full test suite green (`npm test`) — 75/75 passed (2026-06-30)
- [ ] Write justification for each permission (required in CWS dashboard as of MV3 policy)
- [ ] Data usage disclosure form in CWS dashboard (declare no data collection, per privacy policy) — draft answers in `STORE_LISTING.md`

## Post-submission
- [ ] Monitor review status (can take hours to days)
- [ ] Prepare responses to potential reviewer rejection reasons (most common: missing/incomplete privacy policy, unclear permission justification)
