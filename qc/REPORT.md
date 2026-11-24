# Web QC — 2026-10-15

## Result

15 automated parser/core/API/connector/account tests passed. 17 main browser checks and 12 additional feature checks passed in Chrome on Windows. Screenshots of synthetic data were inspected at desktop and 390px mobile widths, in light and dark themes.

The supplied 123.zip parsed successfully directly in Node and in the browser worker. It contains a 13,439,192-byte J2K backup: 1,818 manga entries, 206 titles containing non-ASCII characters, 1 AniList tracker match, and 1,817 entries without tracker-derived reading status. Original ZIP SHA-256 before/after: 410a1996105efb9df96b86eb27e13d6a43ca4943547d4aeea5e62384a95ce480. No user titles, backup bytes, credentials or account contents are included in this report or release.

## Coverage

| Feature | Verification |
|---|---|
| ZIP, gzip, protobuf, legacy JSON v2 | Real ZIP plus synthetic formats; Unicode, missing metadata, corruption, unsupported and empty inputs |
| Large libraries | 10,000 records in parser and actual browser worker; 50-row pagination |
| Defaults | Score scales, decimal rounding, no-score, status retention, bulk application, instant workflow |
| Review | Search, filters, pagination, inline fields, bulk score/status, reset, include/exclude, merge highest progress, manual matching |
| Validation | Missing IDs/status, scores, negative/fractional progress, known totals, impossible/reversed dates, duplicates |
| Matching | Conservative exact-title/author selection and ambiguity in unit tests; manual ID browser workflow; official live search not account-verified |
| Export | Actual browser project/CSV downloads, project round trip, Unicode/metadata, CSV formula protection, credential exclusion |
| Account sign-in | AniList code flow through browser and loopback using simulated official responses; MAL PKCE exchange simulated; invalid state/cancel/sign-out |
| Imports | Simulated dry run/create/update/no-change, confirmation before write, account identity guard, stale-change rejection, retry without duplicate writes, exclusions/cancel |
| API transport | Simulated throttling/Retry-After, GraphQL rejection, MAL rereading mapping and PATCH payload |
| Local connector | Host/origin/session protection; only loopback; no backup endpoint |
| Privacy | Browser observed zero external requests while loading real ZIP, editing and exporting; no library in localStorage |
| Appearance | Light/dark desktop and mobile render review; no horizontal page overflow at 390px |

## Limits and remaining manual checks

Real AniList/MyAnimeList sign-in and account writes were not performed: user-owned developer credentials and account approval are required. OAuth, imports and retries were tested with simulated responses. Browser permission behavior for hosted-to-local connections varies; the bundled local browser UI is the fallback. Native Save As picker and drag-and-drop are implemented but not separately automated; file input and actual download paths were exercised. Network errors, cancellation, and safety guards have automated coverage but cannot guarantee a remote request was not accepted before cancellation.

No claim is made that 1,818 titles are already matched. The supplied backup has only one AniList tracker ID. Choose a default reading status, enable optional matching if desired, and review uncertain matches or use the skip policy before importing.

## NSFW filter follow-up

Four content-rating tests passed, plus 12 existing automated tests (private backup rerun skipped because the temporary extracted copy was deleted after initial QC). New Chrome coverage passed for every filter mode, individual and bulk classification, search/filter combination, unchanged import inclusion, mobile overflow and runtime errors. Classification and project/CSV persistence are tested; platform rating payloads were simulated. No live account was modified.

## Automatic import workflow 2.1 — 2026-10-15

27 automated tests passed; one optional test requiring the deleted temporary backup copy was skipped. Browser checks passed for the primary automatic workflow, explicit sign-in guidance, ambiguity/no-result handling, duplicate search caching, saved-project resume, and desktop/mobile layout. Existing review/export controls and supplied ZIP loading were regression-tested.

A live read-only test searched 20 evenly spaced titles from the user's 1,818-entry backup through AniList's official API: 14 matched automatically, 1 ambiguous, 5 no result, 0 service errors. This is a sample, not a measured match rate for all 1,818 entries. No titles or account credentials are retained in the report. No real account imports were performed.

A synthetic 1,800-entry run confirmed every uniquely matching record, reused duplicate searches (900 requests for 900 distinct titles), and made no repeated requests after project save/restore. Tests cover pause/resume, alternative titles, linked platform IDs, ambiguity, conflicting authors, sequel numbers, retry after service failure, missing-status fallback, duplicate ID consolidation and keeping existing scores. AniList account previews now use a chunked list snapshot; per-entry checks remain before writes.

File-import endpoints were researched but an official current manga XML schema could not be verified. Direct official API import is the supported import route; review CSV/JSON are not mislabeled as importable files.
