# 引っ越し Hikkoshi 2.2 — automatic library import

## Start

Extract Hikkoshi-2.2.0-local.zip and double-click **Start Hikkoshi.cmd**. Use http://127.0.0.1:43828. Keep the connector window open. Save your current project before updating the app; stopping the connector discards account tokens.

Source users: Node 24+, `node server.mjs --open`. Runtime has no third-party dependencies.

## Main workflow

1. Select your .tachibk backup or ZIP. It is parsed entirely in a browser worker.
2. Choose AniList or MyAnimeList and your defaults, then click **Find IDs automatically**.
3. Let the app search the full library. Primary, alternative and native titles are compared; existing cross-platform tracker links are reused. Unique exact titles can be confirmed without identical author strings. Conflicting authors, sequels with different numbers and ambiguous titles stay unresolved.
4. Sign in, choose **Prepare matched library**, inspect the create/unchanged/skipped counts, then **Confirm & import**. Editing is optional and intended for exceptions.

The primary output is direct import through the official AniList or MyAnimeList API. CSV and JSON exports remain clearly labeled review/project files, not platform-importable files. A native file importer/schema could not be verified sufficiently in the current official web pages, so this release does not invent one.

Missing reading statuses use Plan to Read by default, configurable in Defaults. Existing account entries keep their scores/status/progress by default. Choose Replace explicitly to overwrite them. Multiple source records with the same confirmed destination ID and matching score/status are combined in the import plan, keeping highest progress; original library rows remain available. A copy without a tracker status (defaulted) does not block combining: the tracker-derived status is kept. Novel-format results are listed as candidates but never confirmed automatically.

## Matching a large library

At the documented temporary AniList limit of 30 requests/minute, 1,800 searches take roughly an hour or longer when alternative titles/retries are needed. The app respects throttling and Retry-After. Importing also takes time because each change is checked and written through the official API. Keep the tab open.

Use **Pause matching**, then **Save project** to retain completed matches and candidate suggestions. Reopen that project and click **Find IDs / resume**. Completed entries are not searched again. **Retry unresolved titles** makes fresh searches. Three consecutive service errors pause the run rather than discarding progress. No library is automatically retained after closing the page.

AniList matching works without signing in. MyAnimeList matching uses its official API when a client ID/token is available; otherwise it uses MAL IDs published by AniList's API. Entries without a published mapping may need a direct MAL search with a client ID. There is no guarantee that every source comic exists in either destination catalogue.

## Account connection

Create your own developer application at https://anilist.co/settings/developer or https://myanimelist.net/apiconfig. Its redirect must be exactly **http://127.0.0.1:43828/oauth/callback**. AniList uses its client ID and secret; MAL uses its client ID with PKCE. Complete browser authorization until Hikkoshi says Signed in. Connector running alone does not mean the account is authenticated.

The hosted website can match and review locally. Account operations use the local connector because official login endpoints restrict browser-origin access. If hosted-to-local access is blocked, use the local browser URL.

## Privacy and import behavior

Only titles/IDs needed for optional matching and import are sent to official APIs. No backup upload endpoint exists. Tokens and client secrets stay in connector memory. Saved project/CSV files contain private library data but no account tokens. Appearance is the only localStorage preference. No remote entries are deleted.

Imports use absolute values and re-read each target before changing it. Cancelled requests might already have reached the service; use a fresh dry run before retrying. AniList previews load the account list in chunks instead of making one read request per source entry, with fallback for incomplete lists.

Scores convert to 0–100 for AniList or 0–10 for MAL, rounded to nearest whole number; zero means unrated. Backups do not provide reliable volume progress. Chapter progress uses the highest read chapter number, rounded down. Empty dates preserve existing account dates; MAL dates are not sent. Disabling progress explicitly sets it to zero when replacing entries.

## NSFW filter

All content, Hide NSFW (keep unknown), SFW only, NSFW only and Unclassified only are available in optional Review. Ratings use explicit backup tags, confirmed platform flags or manual overrides. Filtering changes the view only; exclude filtered entries to omit them from an import. Unknown is never treated as confirmed safe.

## Verification

See qc/REPORT.md and qc/live-matching-sample.json. Tests use synthetic accounts; no real account writes were performed. Run `npm test`, `node tests/matching-browser.mjs`, `node tests/browser.mjs`, `node tests/features.mjs`, and `node tests/content-browser.mjs` with Chrome installed. Optional MAPO_TEST_ZIP / MAPO_TEST_BACKUP environment variables point to private backup regression files; these are never bundled.

Official references: https://docs.anilist.co/guide/rate-limiting , https://docs.anilist.co/guide/graphql/queries/media-list , https://docs.anilist.co/guide/auth/authorization-code , https://myanimelist.net/apiconfig/references/api/v2 .
