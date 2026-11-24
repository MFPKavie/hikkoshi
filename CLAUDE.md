# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

引っ越し Hikkoshi (v2.2.0, formerly Mapo Web) moves a Mihon/Tachiyomi/TachiyomiJ2K manga backup (`.tachibk`, `.proto.gz`, raw protobuf, legacy Tachiyomi JSON v2, or a ZIP of one) into AniList or MyAnimeList through their official authenticated APIs. Parsing happens in the browser. Node 24+, browser ES modules, no runtime dependencies.

A separate C#/WPF desktop version (v1.0.1) and the 2.x release archives live in the old workspace `D:\Cheat\Mapo Transformer` (`desktop/`, `web/release/`). It shares no code with this repo. Its `desktop/docs/` holds the upstream Mihon/Tachiyomi Kotlin snapshots with the authoritative protobuf field numbers; check them before changing the parser.

## Commands

```powershell
npm start                                    # node server.mjs on http://127.0.0.1:43828
node server.mjs --open                       # same, opens the browser
npm test                                     # node --test tests/*.test.mjs
node --test --test-name-pattern "fixtures" tests/core.test.mjs   # single test
npm run qc                                   # Playwright browser checks (tests/browser.mjs)
node tests/matching-browser.mjs; node tests/features.mjs; node tests/content-browser.mjs
```

Browser scripts use the installed Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe` (Playwright is the only devDependency) and write screenshots to `qc/screenshots/` (git-ignored). Optional `MAPO_TEST_ZIP` / `MAPO_TEST_BACKUP` point at private real backups for regression runs; never commit or bundle those. Results are summarized in `qc/REPORT.md`.

Keep the internal `mapo` identifiers unchanged (saved-project type `mapo-web-project`, `.mapoproj` extension, `mapo-theme` storage key, `x-mapo-session` header, `MAPO_TEST_*` variables): renaming them would break existing projects and preferences.

When bumping the version, change it in `package.json`, `package-lock.json` (two places), `server.mjs` (`/api/hello` and the console line), the sidebar in `dist/index.html`, and the README title/ZIP name. `app.mjs` checks the connector version with `/^2\.(?:[1-9]|[1-9][0-9])\./` before using batch account reads.

## Architecture

- **There is no build step. `dist/` is the hand-written source** (and the static hosting root, see `.openai/hosting.json`). Edit `dist/*.mjs` directly. Files are written in a dense, few-lines style; keep that style.
- `dist/core.mjs`: parsing (gzip/ZIP/protobuf/JSON), settings, normalization, conversion, validation, duplicate marking/merging, CSV/project, `dryRun`/`execute`. It runs in `parser-worker.mjs` in the browser and directly in Node tests.
- `dist/matching.mjs`: conservative automatic title matching (primary, alternative and native titles; reuses existing cross-platform tracker links; novels and ambiguous entries stay unresolved; pause and resume through a shared cache).
- `dist/api.mjs`: `createTransport` (serial pacing, retry, abort) and `createApi` for AniList and MAL. MAL search without credentials falls back to AniList's published MAL IDs.
- `dist/app.mjs` + `index.html` + `styles.css`: the UI state machine. The sidebar shows the four steps as coloured volume spines (`--spine-1..4` tokens); light and dark themes are `:root` and `:root[data-theme=dark]`. Fonts are system fonts only (no font downloads).
- `server.mjs` exports `startServer({port, fetchImpl, interval, staticRoot})` and returns `{server, origin, close}`. It serves `dist/` and is the **local connector** for OAuth and account writes, because the provider login endpoints block browser origins. It checks the Host header, allows only listed Origins, and uses a per-run session secret (`x-mapo-session`). Tokens and client secrets stay in its memory. Tests start it with `port:0, interval:0` and a mocked `fetchImpl`.

## Invariants to preserve

- Account writes always go dry run → user confirmation → import. Imports never delete remote entries, use absolute values, and re-read the target before writing.
- Never invent a platform file-import format. CSV/JSON exports are review/project files only.
- No telemetry, no third-party requests (including fonts), and no backup uploads. Only titles/IDs go to official APIs. Never persist or log tokens or client secrets.
- The OAuth redirect URL is fixed: `http://127.0.0.1:43828/oauth/callback`. AniList uses authorization code + client secret; MAL uses a client ID + plain PKCE.
- Progress is the highest read chapter number rounded down, not a count of chapters. Backup publication status is not reading status.
- Fixtures in `tests/fixtures/` are synthetic. Never add real user backups.

## Releases

Build output goes in `release/` (git-ignored). A release is `Hikkoshi-<v>-local.zip` (`dist/`, `server.mjs`, `README.md`, `Start Hikkoshi.cmd`, a bundled Windows `node.exe` + `NODE-LICENSE.txt`), `Hikkoshi-<v>-source.zip` (`git archive`), `hikkoshi-site-<v>.tar.gz` (`dist/` only, without `.openai/`), and `SHA256SUMS-<v>.txt`.
