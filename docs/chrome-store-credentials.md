# Chrome Web Store API Credentials

Credentials used by `.github/workflows/chrome-store.yml` to upload and publish
the extension when the `manifest.json` version changes on master.

## Repository secrets

Set in GitHub → Settings → Secrets and variables → Actions (or `gh secret set`):

| Secret | What it is | Where it comes from |
|---|---|---|
| `CHROME_EXTENSION_ID` | Store item ID (`kbcgfggnhlgcgemjgnoffkcgeodcjjaj`) | CWS dashboard URL after first manual submission |
| `CHROME_CLIENT_ID` | Google OAuth client ID | Google Cloud Console → Credentials |
| `CHROME_CLIENT_SECRET` | Google OAuth client secret | Same OAuth client |
| `CHROME_REFRESH_TOKEN` | Long-lived token the workflow exchanges for access tokens | `npx chrome-webstore-upload-keys` |

## Initial setup (done 2026-07-01)

1. Google Cloud Console → project → enable **Chrome Web Store API**.
2. OAuth consent screen: user type **External**; add your Google account under
   **Test users** (Console → APIs & Services → OAuth consent screen /
   `console.cloud.google.com/auth/audience`). Without this, the auth flow
   fails with `Error 403: access_denied` ("has not completed the Google
   verification process").
3. Credentials → Create OAuth client ID → type **Desktop app** → note client
   ID + secret.
4. Run `npx chrome-webstore-upload-keys`, paste client ID/secret, complete the
   browser consent flow → prints `REFRESH_TOKEN`.
5. Set all four repo secrets.

Full upstream guide:
<https://github.com/fregante/chrome-webstore-upload/blob/main/How%20to%20generate%20Google%20API%20keys.md>

## Refresh token expiry — the permanent fix

**Problem:** while the OAuth consent screen is in **Testing** mode, Google
expires refresh tokens after **7 days**. The deploy workflow then fails at the
upload step with an invalid-grant / auth error until the token is regenerated.

You can confirm the expiry by exchanging the token and checking
`refresh_token_expires_in` in the response (~604800 = 7 days; absent or huge =
production, no expiry):

```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d client_id="$CLIENT_ID" \
  -d client_secret="$CLIENT_SECRET" \
  -d refresh_token="$REFRESH_TOKEN" \
  -d grant_type=refresh_token | jq '.refresh_token_expires_in'
```

**Fix — move the OAuth app to production (one time):**

1. Open <https://console.cloud.google.com/auth/audience> (pick the project).
2. Click **Publish app** (Testing → In production). No Google verification is
   required for this scope; the consent screen just shows an "unverified app"
   warning, which is fine — it's your own single-user app.
3. Regenerate the refresh token with the same client ID/secret:
   ```bash
   npx chrome-webstore-upload-keys
   ```
   (Testing-mode tokens keep their 7-day clock even after publishing — a new
   token must be minted.)
4. Update the secret:
   ```bash
   gh secret set CHROME_REFRESH_TOKEN --repo keithfry/jd-grab
   ```

Production refresh tokens do not expire on a timer. They can still be revoked
by: manually revoking access at <https://myaccount.google.com/permissions>,
changing the Google account password (in some cases), or ~6 months of complete
disuse. If the workflow ever fails auth again, repeat steps 3–4.
