# kill-the-resume Project Memory

Last updated: 2026-06-23 Asia/Shanghai

This file is the durable project memory for new Codex conversations. Read it before making project changes, then verify any stale-sensitive facts against source files.

## Product Direction

- Project name: `kill-the-resume`.
- Root documentation now has Chinese `README.md` plus English `README.en.md`; both display `web/public/favicon.svg` as the project icon and explain the tactical terminal / torn resume / kill slash / KTR visual meaning.
- Product goal: build a disruptive online resume editor for geeks/developers, treating a resume as a personal core data console rather than a static document.
- Primary UX language: Futuristic Tactical Console / Tactical Terminal.
- Browser/site icon direction: tactical dark terminal favicon with cyber-green/cyan/orange targeting brackets, torn resume document, red kill slash, and KTR mark. Assets live in `web/public/favicon.svg`, `favicon.ico`, `apple-touch-icon.png`, `icons/icon.svg`, `icons/icon-192.png`, `icons/icon-512.png`, with manifest `web/public/site.webmanifest` and metadata in `web/src/app/layout.tsx`.
- User-facing default language: Chinese, with an English toggle for multi-user language preference. Browser tab title scrolls according to the selected language: Chinese uses `Kill The Resume ! 欢迎来到你的简历杀手控制台`, English uses `Kill The Resume ! Welcome to Your Resume Killer Console`; home description/CTA are `欢迎来到你的简历杀手控制台。` / `进入控制台` in Chinese and `Welcome to your resume killer console.` / `Enter console` in English; editor hero description is `在这里管理简历内容、模块顺序与显示状态，右侧会同步呈现最终 A4 版式效果。` / `Manage your resume content, module order, and visibility here while the final A4 layout updates live on the right.`; HTML `lang` and meta description follow the selected language on the client, while SSR metadata defaults to Chinese.
- Current work focus: frontend editor, first backend integration for accounts/resume persistence, and the frontend-first `机会雷达` job opportunity discovery MVP.
- Backend stack: Go 1.26.x, Gin, GORM, PostgreSQL.

## Production Deployment

- Current target deployment shape as of 2026-06-15: frontend should be deployed on Vercel from GitHub with Vercel Root Directory `web`; the Go backend is publicly exposed at `https://api.killer.wrenzeal.top` via nginx HTTPS reverse proxy to `127.0.0.1:19304`. Set Vercel `KTR_BACKEND_ORIGIN=https://api.killer.wrenzeal.top` and `NEXT_PUBLIC_API_BASE_URL=/api/v1`.
- Vercel frontend configuration lives in `web/vercel.json`; set Vercel environment variable `NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1`. `web/next.config.ts` still supports optional same-origin rewrites through `KTR_BACKEND_ORIGIN`, but direct API subdomain is the recommended production path so browser Network requests show `api.killer.wrenzeal.top` and do not depend on Vercel rewrite activation.
- `web/src/lib/api.ts` keeps local/remote development compatibility: localhost uses `http://127.0.0.1:19304/api/v1`; remote HTTP development derives `http://<current-host>:19304/api/v1`; HTTPS production/frontends should use direct `https://api.killer.wrenzeal.top/api/v1`. If Vercel has a stale/relative `NEXT_PUBLIC_API_BASE_URL=/api/v1`, the API client now treats that as stale on HTTPS and falls back to `https://api.killer.wrenzeal.top/api/v1`.
- Backend CORS defaults now include localhost dev origins plus `https://*.vercel.app`, with Gin wildcard support enabled. Production `/var/www/kill-the-resume/shared/backend.env` currently includes `https://killer.wrenzeal.top`, `https://*.vercel.app`, and `https://api.killer.wrenzeal.top`; after binding any additional custom frontend domain, add that exact origin to `CORS_ORIGINS`. Vercel rewrites are preferred because they keep browser API calls same-origin.
- Previous self-hosted frontend release retained for historical/rollback context: `/var/www/kill-the-resume/release/20260610-111411`; PM2 `kill-the-resume-frontend` was online and `https://killer.wrenzeal.top/editor` returned 200. Going forward, do not assume the frontend is still served from that PM2 process unless verified.
- HTTPS renewal for backend API is installed via repo script `script/renew-killer-cert.sh`, installed command `/usr/local/bin/renew-killer-cert`, systemd `killer-cert-renew.service`, and `killer-cert-renew.timer` running twice daily with randomized delay. The script defaults to renewing only `api.killer.wrenzeal.top` because `killer.wrenzeal.top` is being migrated to Vercel and may no longer resolve to this server; it still supports `DOMAINS=` / `DOMAIN=` overrides for additional local lineages. Latest dry-run for `api.killer.wrenzeal.top` succeeded.
- Public domain before Vercel migration: `https://killer.wrenzeal.top` with HTTP -> HTTPS redirect via Certbot-managed nginx config. Do not include `killer.wrenzeal.top` in this server's dedicated killer cert-renew timer unless DNS points back to this nginx host or the ACME challenge path is otherwise routed here; dry-run failed while it resolved to Vercel IP `216.198.79.65`.
- Backend PM2 process: `kill-the-resume-backend`, binary at `/var/www/kill-the-resume/backend/kill-the-resume-backend`, environment at `/var/www/kill-the-resume/shared/backend.env` with production JWT secret redacted from docs; production backend listens on `127.0.0.1:19304`. Nginx site config `/etc/nginx/sites-available/api.killer.wrenzeal.top` proxies `https://api.killer.wrenzeal.top/` to that backend and redirects HTTP to HTTPS. PM2 is currently retained for the Go binary and is acceptable for this single-host deployment; consider systemd only if stronger OS-level service supervision is needed.
- Deployment scripts in repo root `script/`: `deploy-killer-frontend.sh`, `deploy-killer-backend.sh`, `start-killer-backend.sh`, `renew-killer-cert.sh`. `deploy-killer-frontend.sh` is now mainly for rollback/self-hosted frontend scenarios; Vercel is the preferred frontend host. `renew-killer-cert.sh` is the source for `/usr/local/bin/renew-killer-cert`; update both/reinstall when changing renewal behavior.

## Repository Shape

- Root directory is the workspace and future backend home.
- Frontend is isolated under `web/` for frontend/backend separation.
- Root `package.json` proxies frontend commands:
  - `npm run web:dev`
  - `npm run web:test`
  - `npm run web:build`
  - `npm run web:lint`
  - `npm run web:typecheck`
  - `npm run web:start`
- Frontend app entry: `web/src/app/editor/page.tsx`.
- Main design source: `DESIGN.md`.
- Change log: `CHANGE.md`.
- Pending work only: `todo_list.md`.
- GitHub publication status as of 2026-06-11: local `main`, tracking `origin/main`, and remote GitHub `refs/heads/main` all point to commit `9aae833345f7a19b5fd8786e0c95edaff3f9d201`; the previous push credential blocker is resolved.


## Current Backend Stack

- Backend lives under `backend/`.
- Go module: `kill-the-resume/backend`, `go 1.26.3`.
- HTTP entry: `backend/cmd/server/main.go`.
- Config defaults in `backend/internal/config/config.go`; default PostgreSQL password is `8246baba` for the local Docker database; development CORS includes local ports plus remote host `38.246.253.179` on common frontend ports.
- Database initialization in `backend/internal/db/db.go` creates schema `kill_the_resume`, runs GORM AutoMigrate, then applies repo-owned versioned migrations recorded in `schema_migrations` via `backend/internal/db/migrations.go`.
- Tables currently live under `kill_the_resume`: `users`, `resumes`, `job_postings`, `job_search_caches`, `job_search_results`, `job_radar_preferences`, and `job_radar_plugin_tokens`.
- Auth implementation: bcrypt password hashes + JWT Bearer tokens. Login/auth hardening includes generic login failure messages, IP and IP+email in-memory rate limiting, JWT HS256 + issuer/audience/exp/nbf validation, production JWT secret validation, JSON content-type/body-size guards, security headers, and hashed-email security audit logs. Opportunity Radar browser extension tokens use a separate `ktrp_` prefix, are stored only as SHA-256 hashes in `job_radar_plugin_tokens`, can expire/be revoked, and are accepted only by `POST /api/v1/job-radar/import` rather than general account/resume endpoints.
- Resume persistence stores each user resume as `jsonb` content with metadata `title`, `targetRole`, timestamps, and soft delete. Backend create/update normalization requires a JSON object, normalizes legacy project/work/education period strings, and stamps `schema: "kill-the-resume.resume.v1"` plus `version: 1`.
- Backend API base path: `/api/v1`; health endpoint: `/healthz`. Production listener is `127.0.0.1:19304` behind nginx; source default `SERVER_ADDR` is now `:19304` unless overridden.
- Root commands:
  - `npm run backend:dev`
  - `npm run backend:test`
  - `npm run backend:build`
- Backend docs/env example: `backend/README.md`, `backend/.env.example`.

## Current Frontend Stack

- Next.js `16.2.9` App Router.
- PDF export direct dependencies: `pdf-lib` + `@pdf-lib/fontkit`. Do not reintroduce screenshot/canvas-based PDF export unless explicitly requested. PDF export code is dynamically imported from `ResumeExportActions` only when the user clicks PDF export, so these large dependencies must not be reintroduced into the editor initial JS bundle.
- Frontend regression tests use Node 24 native test runner with TypeScript stripping and a local alias loader (`web/test/register-ts-paths.mjs`, `web/test/alias-loader.mjs`); run via `npm run web:test` or `npm --prefix web run test`.
- React `19.2.7`.
- TypeScript `6.0.3`.
- Tailwind CSS `4.3.0` via `@tailwindcss/postcss`.
- Zustand `5.0.14` for editor and preference state.

## Implemented Editor Capabilities

- Structured date ranges: project/work/education `period` fields are no longer free-text strings in the editor. They use `{ start: "YYYY-MM", end: "YYYY-MM" | "", isPresent: boolean }`, edited via the custom Tactical Terminal month picker plus a Present/至今 status button (not native `type=month`). Preview/PDF use `formatDateRange`; old string periods are parsed by `coerceDateRange` for compatibility. Frontend `normalizeResumeDraft` normalizes loaded drafts, and backend `POST/PUT /api/v1/resumes` normalizes legacy string periods before storing `resumes.content` JSONB.

- `/editor` has a three-column, fixed-height tactical layout:
  - left: tactical navigation and module controls;
  - center: scrollable editing console;
  - right: live A4 preview sandbox.
- The interface follows a dark high-contrast console style with cyber green, warning orange, trace cyan, monospace labels, hard lines, and white A4 paper contrast.
- Editor shell typography is intentionally larger than the early prototype for readability: navigation buttons are ~13px, hero/body descriptions ~15px, and form inputs ~15-16px; keep A4 resume preview/PDF typography separate unless explicitly changing resume output layout.
- Language toggle supports Chinese/English and persists user preference in local storage. `LanguageHydrator` runs a rolling browser-tab title based on `meta.title`, syncs `document.documentElement.lang`, `dir`, and the canonical description meta from i18n keys, while removing duplicate description meta nodes that Next/client transitions may leave behind.
- Left navigation buttons are functional, not placeholders.
- Resume modules can be reordered by drag/drop in the left navigation.
- Modules can be hidden/shown.
- Repeatable modules can be added, including project experience, work history, and education.
- Fields inside modules can be reordered and hidden/shown.
- Form edits update the right preview in real time through frontend state; no backend is needed for current preview interactivity. Resume theme color is part of the draft JSON (`theme.presetId`, `theme.accentColor`) and updates the A4 preview immediately.
- Basic information supports a personal photo in `draft.identity.photo`: the editor accepts PNG/JPG/WebP uploads, compresses them to a data image payload in resume JSON, normalizes old drafts/layouts that lack the field, and renders the photo in both the live A4 preview and vector PDF export. Resume output intentionally shows the photo directly without a decorative frame/border/shadow. When no photo is present, the original compact top-right contact layout is preserved; when a photo is present, email/city/website contacts sit to the left of the photo without adding a separate row below the title.
- Basic information website/contact output has a dedicated compact display protocol: preview/PDF hide `https://` and `www.` in the visible text, keep website casing readable, constrain it to the contact column, clamp to two lines, and PDF export truncates safely instead of drawing past the A4 right edge. Clickable website targets must use `formatWebsiteHref` so bare domains like `example.dev` open as external `https://example.dev/` links instead of app-relative paths; PDF export adds explicit URI annotations for the same target.
- The built-in skills module is user-facing as `专业技能` / `Professional Skills`. It stores content in `draft.skills` with four built-in content fields (`languages`, `frontend`, `backend`, `tools`), user-editable built-in labels in `labels`, user-added skill categories in `customCategories[]`, `displayMode` (`markdown` or `tags`), and `columnMode` (`one` or `two`). Built-in categories can be renamed and hidden/reordered via field layout; custom skill categories can be added, hidden/shown, deleted, and rendered in both preview and vector PDF. During editing, skill category labels intentionally preserve raw user input, including empty strings, so backspace/delete does not immediately restore defaults; cloud save and JSON export use `normalizeResumeDraftForPersistence` / `normalizeSkillMatrixForPersistence` to fill empty labels with defaults only at persistence time. Markdown mode must preserve authored Markdown in preview/PDF, while tag mode stores newline-delimited tags generated by Enter and does not use fullscreen Markdown editing. Legacy drafts are normalized to default labels only when labels are missing, empty custom categories, Markdown mode, and two columns.
- Custom resume modules are supported in the frontend draft JSON as `customModules[]`. Users can add, show/hide, delete, rename, reorder, and edit custom modules; built-in modules remain non-deletable and only support show/hide/reorder. Custom module fields support editable titles, show/hide, delete/reorder, and field types `text`, `textarea`, and structured `date` (`DateRange`). The export module is editor-only and fixed as the final left-nav step above the add-custom-module button; custom modules are inserted before `export`, and layout normalization/move actions keep `export` last.
- Preview auto-fits content and supports up to two A4 pages. If content exceeds the intended density, it shows compression/risk signals rather than silently overflowing. Module titles, item titles, field captions, and skill category subtitles in preview/PDF are intentionally larger/bolder than body text to preserve clear resume hierarchy.
- Live preview visibility is user-toggleable in the editor UI: it defaults to visible for a fresh editor session, can be hidden from the preview header or top status strip, and exposes a slim right-side restore dock only while hidden. This UI state is intentionally outside resume draft/cloud persistence.
- Dev server is configured for remote IP preview:
  - `web/package.json` uses `next dev -H 0.0.0.0`.
  - `web/next.config.ts` includes `allowedDevOrigins: ["38.246.253.179"]`.

## Implemented Opportunity Radar Capabilities

- `/job-radar` is a backend-backed `机会雷达` / `牛马雷达` MVP. The page calls `GET /api/v1/job-radar/jobs` for real cached job postings scoped by the current search fingerprint; frontend job mock data and backend-unreachable fallback lists have been removed, so backend failures show an error/empty state instead of fake postings. Logged-in users also use authenticated `GET` / `PUT /api/v1/job-radar/preferences` so the latest manual search criteria persist on the account and are restored after refresh or later login; they can use the page import dialog with their login session or the browser extension with a generated `ktrp_` plugin token to call `POST /api/v1/job-radar/import` and store real postings from job sites/company pages into the current search scope.
- `/job-radar` page copy is wired to the shared Chinese/English i18n system; do not add hardcoded Chinese labels for top-right actions, panel controls, placeholders, metrics, sort hints, backend status, or display data. `createDefaultJobRadarCriteria(language)` returns localized default search criteria; English-mode default criteria have regression coverage against CJK text. Job match tags are structured as `kind + label`; UI should display only the concrete label and use color plus the legend to explain whether a tag is a keyword, skill, location, company type, risk, or gap.
- The page keeps the Tactical Terminal visual language and uses a three-column layout: manual search criteria, ranked job list, and selected job/source detail. The home page has a `启动机会雷达` / `Launch Job Radar` entry.
- Search criteria currently support job keywords, locations, company nature, technical keywords, exclude keywords, and minimum match percentage. For authenticated sessions, the console waits for preference restore before the first feed query so existing account criteria are not overwritten by language defaults.
- `web/src/lib/job-radar.ts` owns pure frontend types/functions for default criteria, criteria normalization, percentage matching helpers, match tags, warning tags, source URL preservation, freshness status, and expired-job filtering. It no longer contains product mock postings. The production feed is fetched through `web/src/lib/api.ts` using `buildJobRadarJobsPath` / `apiClient.listJobRadarJobs`; authenticated import uses `apiClient.importJobRadarPosting`; the frontend supports `refresh=1` via the `刷新岗位源` / `Refresh Job Source` button for the current search scope, sends refresh requests with browser `no-store`, and displays the online fetch/link counts returned by the backend.
- Job lifecycle policy for the MVP: `hot` within 7 days, `normal` within 30 days, `stale` within 45 days, and `expired` afterward; expired postings are filtered from the UI and cache rows older than 60 days are deleted.
- Backend opportunity-radar data lives in `backend/internal/jobradar`: Remotive public API client, repository/upsert, per-search on-demand sync, expiration cleanup, user preference persistence, and Go-side matching. `backend/internal/models.JobPosting` is the canonical source-job cache and stores `sourceName`, `sourceJobId`, `sourceUrl`, `postedAt`, `firstSeenAt`, `lastSeenAt`, `expiresAt`, and `freshnessStatus`; `JobSearchCache` stores normalized search criteria plus `lastSyncedAt`; `JobSearchResult` links a search fingerprint to cached jobs so changing role keywords (for example frontend -> backend) creates/uses an independent result set instead of the previous global cache; `JobRadarPreference` stores one normalized latest search criteria record per user; `JobRadarPluginToken` stores per-user browser-extension token metadata/hash for scoped import authentication. Default sync interval is 360 minutes per search fingerprint; `excludeKeywords` and `minScore` only affect local filtering/scoring and do not create a new source-fetch scope. `refresh=1` / `forceRefresh=true` is strict online refresh: Remotive requests use no-cache headers plus a cache-buster, current-scope result links are replaced by this fetch, and source failure returns an error instead of falling back to old cached rows. Chinese role/location/company tokens such as `后端`, `前端`, `远程`, `深圳`, `外企` are expanded to English source/matching terms for the Remotive backend. Keep Remotive source attribution and source URL links visible because their public API terms require source mention and link-back, and avoid high-frequency polling.


## Frontend Backend Integration

- `web/src/lib/api.ts` contains the browser API client and `resolveApiBaseUrlForEnvironment`. It must not default remote browser sessions to `127.0.0.1`; local loopback uses `http://127.0.0.1:19304/api/v1`, remote HTTP development derives `http://<current-page-host>:19304/api/v1`, and HTTPS frontends such as Vercel use same-origin `/api/v1` unless `NEXT_PUBLIC_API_BASE_URL` is an explicit non-loopback API URL.
- Vercel production pattern: set `NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1`. Optional `KTR_BACKEND_ORIGIN=https://api.killer.wrenzeal.top` rewrites may remain, but direct API subdomain is preferred because the deployed Vercel site returned 404 for same-origin `/api/v1/*` when rewrites were missing/stale.
- PDF font fallback still first uses static frontend fonts (`/fonts/...`) and Next font route (`/api/fonts/...`). Direct backend font fallback now derives from `getApiBaseUrl()` only when the API base is an absolute URL; same-origin Vercel rewrites should normally make backend font fallback unnecessary.
- Cloud session recovery: `CloudResumeDock` preflights persisted JWT shape/expiry/issuer/audience before auto-loading `/resumes`, auto-clears stale sessions, and treats authorized-request `401` as session expiration instead of repeatedly retrying with a bad token. `/job-radar` manages Opportunity Radar extension tokens: logged-in users can list metadata, generate/copy a one-time `ktrp_` token, and revoke tokens without exposing the login JWT to the extension. `CloudResumeDock` remains scoped to account/cloud resume sync only.
- `CloudResumeDock` should present cloud sync in user-facing language only; do not render `/api/v1` or other developer endpoint details in the visible panel copy.

- `web/src/store/cloud-store.ts` persists only the current cloud session token/user in local storage; `currentResumeId` is in-memory only and must be set by loading or creating a cloud resume in the current session.
- `web/src/components/editor/CloudResumeDock.tsx` provides the tactical account/cloud-resume panel in `/editor`.
- Frontend API configuration examples live in `web/.env.example`.
- Verified browser flow: language toggle, register user, save current draft, list cloud resumes, load a cloud resume back into the editor.
- Layout note: `ResumePreview` uses a fixed shrink-0 right rail and lower z-index so it does not intercept middle/top editor controls.

## Important Frontend Files

- `web/src/store/editor-store.ts`: Zustand resume draft, module state, field/module layout actions.
- `web/src/store/preferences-store.ts`: language preference persistence.
- `web/src/components/editor/LanguageHydrator.tsx`: client-side language metadata sync for browser title, `html lang`, `dir`, and description meta.
- `web/src/store/cloud-store.ts`: cloud session/list state persistence. Long-lived localStorage deliberately persists token/user only, not `currentResumeId`; the currently loaded cloud resume ID plus draft snapshot are kept only in per-tab `sessionStorage` so browser refresh restores the active resume while closing the tab starts a clean editor context and cannot accidentally overwrite a previous cloud resume.
- `web/src/types/resume.ts`: resume data and layout types.
- `web/src/lib/resume-defaults.ts`: default resume draft and module layouts.
- `web/src/lib/date-range.ts`: structured date range coercion/normalization/formatting for period fields.
- `web/src/lib/custom-modules.ts`: custom module/field creation, normalization, field-type coercion, and date-field value handling.
- `web/src/lib/resume-theme.ts`: lightweight resume accent theme presets, color validation, normalization, and hex-to-RGB conversion for preview/PDF.
- `web/src/lib/markdown.ts`: lightweight no-dependency Markdown parsing/helpers for fullscreen editing, A4 preview readable rendering, density calculation, and vector PDF text cleanup. It preserves ordered-list metadata (`ordered/order`) so `1.` / `2.` render as numbered items while `-` remains unordered.
- `web/src/lib/resume-normalize.ts`: normalizes loaded drafts, especially legacy string `period` fields, before replacing editor state.
- `web/src/lib/resume-projection.ts`: shared pure projection helpers for preview/PDF field captions, field visibility, module items, identity contact links, meta fields, and skill section categories/display modes. Keep preview and PDF on this shared path for high-risk formatting rules.
- `web/src/lib/resume-layout.ts`: module/field layout helpers.
- `web/src/lib/skills.ts`: professional skills defaults, built-in/custom category normalization, label fallback, tag splitting/joining, and preview/PDF category projection.
- `web/src/lib/job-radar.ts`: Opportunity Radar pure data/matching layer, default criteria, criteria normalization, freshness policy, match-percent calculation, tag extraction, expired-job filtering, and source URL preservation; it must not reintroduce product mock postings unless explicitly requested.
- `web/src/app/job-radar/page.tsx` and `web/src/components/job-radar/JobRadarConsole.tsx`: Tactical Terminal opportunity radar page and client-side three-column job search console, including the authenticated manual job import dialog.
- `web/src/components/editor/TacticalNav.tsx`: left navigation, drag/drop, visibility/add controls.
- `web/src/components/editor/ResumeModuleConsoles.tsx`: active module editing panels; date range and photo upload controls are split into `DateRangeField.tsx` and `IdentityPhotoField.tsx`.
- `web/src/components/editor/FieldLayoutControls.tsx`: field reorder and visibility controls.
- `web/src/components/editor/ResumePreview.tsx`: live preview, fit scaling, max-two-page behavior, paper accent color from `draft.theme.accentColor`, and readable rendering of common Markdown in long text fields. Page-count decisions use a hidden fixed-width 500px A4 measurement paper so DevTools/F12 or viewport width changes do not flip the preview between one and two pages.
- `web/src/components/editor/ResumeThemePanel.tsx`: tactical fixed-theme/color-picker control panel for resume accent color.
- `web/src/components/editor/PreviewToggle.tsx`: Tactical Terminal preview hide/show controls for the top status strip and hidden-preview restore dock.
- `web/src/components/editor/TacticalTextField.tsx`: shared tactical input field; long textarea fields open a fullscreen Tactical Markdown editor with toolbar, edit/split/preview modes, and live store updates.
- `web/src/app/globals.css`: global tactical visual system and focus animations.
- `web/src/lib/resume-pdf.ts`: `pdf-lib` + `fontkit` vector PDF renderer based on resume JSON, block pagination, max two pages, bottom footers.
- `web/src/lib/api.ts`: frontend API client for backend auth and resume persistence.
- `web/src/components/editor/CloudResumeDock.tsx`: account login/register plus cloud save/list/load/delete panel. Loaded cloud resumes set an active `currentResumeId`, restore across browser refresh through per-tab session storage, and the active resume badge must stay single-line via nowrap/shrink-safe styling. The primary save button updates that resume with `PUT /resumes/:id`, while `另存为新简历` / `Save as new` explicitly creates a new resume with `POST /resumes`. The `新建默认简历` / `New default resume` action resets the editor to `initialResumeDraft`, clears `currentResumeId` plus the tab restore session, and makes the next save create a new cloud resume instead of overwriting the previously loaded one.
- `backend/internal/httpx/security.go`: backend auth/API security helpers: headers, JSON/body guard, login/register validation, auth audit log hashing.
- `backend/internal/httpx/resume_content.go`: backend resume JSON normalization, schema/version stamping, and legacy period coercion for cloud persistence.
- `backend/internal/db/migrations.go`: lightweight versioned migration runner that executes after AutoMigrate and records applied migrations in `schema_migrations`.
- `backend/internal/jobradar/`: Opportunity Radar backend package for Remotive public API ingestion, user-imported posting normalization, stable import source IDs, `job_postings` canonical cache upsert, `job_search_caches` / `job_search_results` per-search caching, `job_radar_preferences` account-level criteria persistence, lifecycle freshness/cleanup, and match-percent scoring used by `/api/v1/job-radar/jobs` and `/api/v1/job-radar/import`.
- `backend/internal/httpx/rate_limiter.go`: single-instance in-memory login/register rate limiter.
- `web/public/fonts/ktr-paper-*.ttf`: shared paper font assets for A4 preview and `pdf-lib` export (`sans`, `sans-bold`, `mono`, `mono-bold`, `cjk`); `ktr-paper-cjk.ttf` uses a split WenQuanYi Micro Hei TrueType asset for broad Chinese glyph coverage, sharper CJK rendering than Zen Hei, and stable poppler/PDF compatibility.

## Visual Decisions To Preserve

- Keep the current Tactical Terminal UI/UX consistent for all future pages unless the user explicitly asks to redesign.
- Scrollable editor surfaces use the global `.tactical-scrollbar` visual system: thin square cyber scrollbar, dark rail, cyan/green/orange thumb, and visible hover glow. Apply it to new scroll containers instead of browser-default scrollbars; textarea scrollbars inherit the same style via `.tactical-input:where(textarea)`.
- Time/date controls must use the custom TacticalMonthPicker visual language: dark tactical card, cyber-green/trace-cyan highlights, year stepper, month matrix, and Present/至今 status button. Do not revert to browser-native `type=month` inputs unless explicitly requested.
- Input focus animation is currently the first-version single-layer neon sweep:
  - single `.tactical-field::before` layer;
  - `linear-gradient(90deg, transparent, rgba(57, 255, 136, 0.9), rgba(88, 230, 255, 0.75), transparent)`;
  - `animation: neon-sweep 1.75s linear infinite`;
  - `background-repeat: no-repeat` to hide the visible loop seam;
  - `will-change: background-position, opacity` for smoother rendering.
- Do not reintroduce the rejected double ghost-sweep or `repeating-linear-gradient` versions unless the user explicitly asks.

## Export Status

- Resume export currently does not require backend.
- Implemented frontend export actions in `web/src/components/editor/ResumeExportActions.tsx`:
  - PDF export calls `exportResumePdf(draft, filename, t)` and waits for `pdf-lib` generation;
  - download full structured resume JSON with schema version `kill-the-resume.resume.v1`.
- Current PDF export is not screenshot-based: `web/src/lib/resume-pdf.ts` draws text, separators, module blocks, pagination, theme accent color, and footers directly from `ResumeDraft` JSON with `pdf-lib` + `fontkit`. It must receive the current `t()` translation function so PDF module titles, field labels, and footers follow the active Chinese/English language.
- PDF/JSON export includes `customModules[]`; vector PDF draws custom module titles, custom field labels/values, and custom date fields from the same draft JSON used by the live preview. JSON/cloud persistence keeps Markdown source text as authored, while live A4 preview and vector PDF render common Markdown syntax as readable resume text instead of leaking markers like `##` or `**`.
- PDF pagination is now line-flow based and capped at two A4 pages. It keeps the first-page header, places footers near the physical A4 bottom, and splits module content by field/text-line/bullet-line units so the next module continues on the current page until there is no remaining space. Do not revert to whole-module pagination; that caused large blank areas before work history. Limited density scaling is applied only when needed to avoid clipping or abnormal bottom whitespace. PDF content should be generated from the same preview field protocol: `getOrderedFields`, field visibility/order, preview i18n labels, bullet handling, skills matrix, and export protocol. Live A4 preview and exported PDF footers intentionally contain only `目标岗位/Target Role: <targetRole>` on the left and `PAGE_XX` on the right; do not re-add generator/density footer text unless requested.
- `web/public/fonts/ktr-paper-*.ttf` fonts are embedded at export time. PDF drawing mirrors the preview font roles: sans for body/headings, mono for tactical labels/meta/footer, and CJK fallback for Chinese text segments.
- Rejected/removed route: browser native printing, hidden print mirrors, html2canvas screenshots, and color-sanitized canvas clones caused clipping, unsupported color functions, or spacing mismatch. Do not route PDF export back through screenshot/canvas capture unless the user explicitly reverses this decision.
- Export controls are available in the top status strip and in the `export` module panel.
- Backend should be added later for accounts, cloud persistence, share links, server-side PDF rendering, export job queues, or audit history.

## Current Chinese Copy Decisions

- Chinese UI copy is intentionally less literal and more user-facing:
  - left navigation title: `简历结构`;
  - identity module: `基本信息`;
  - identity fields: `目标岗位`, `手机号`, `城市`, `基本介绍`;
  - project module title: `项目介绍`;
  - project fields: `项目名称`, `任务目标`, `工作内容`;
  - skills module: `专业技能`;
  - education console/preview title: `教育经历`;
  - export module: `导出`.
- Export is an editor-only control module. It is fixed outside the draggable module list as the final left-nav step above the add-custom-module button, and must not render as a resume section in the live A4 preview or PDF body.
- Live preview two-page mode stacks pages vertically with scroll (`flex-direction: column`, vertical overflow) instead of horizontal side-by-side display.
- Work-history `bullets` fields are user-facing as `工作内容` / `Work Content` but keep the underlying JSON key `work.bullets` for compatibility. They are Markdown-authored text: do not auto-convert plain lines into bullets; render bullets only when the user explicitly writes Markdown list syntax such as `- ` or `1.`. Punctuation and ordinary newlines must remain authored text.
- Long textarea fields support a tactical fullscreen Markdown editor in `TacticalTextField`; keep real-time store updates active in both inline and fullscreen modes. The Markdown editor is intentionally no-dependency and supports headings, bold, italic, ordered/unordered lists, quotes, inline/fenced code, and source/preview/split modes. Ordered lists must keep visible numbering in fullscreen preview, A4 preview, and PDF export.
- PDF font loading has a browser-side fallback: font requests are retried with cache-bust; if sans/mono normal or bold font fetch/embed fails, use PDF standard Helvetica/Courier fallbacks so export does not fail on transient static asset 502s. CJK custom font remains required for Chinese glyph coverage.
- PDF text rendering normalizes zero-width characters, NBSP, full-width spaces, and related Unicode spaces before drawing; CJK punctuation/full-width symbols are treated as CJK font runs to avoid `.notdef` square/× boxes in mixed Chinese-English PDF output.
- Font fallback routes: PDF export tries `/fonts/<name>`, then Next `/api/fonts/<name>`, then backend `http://<current-host>:19304/assets/fonts/<name>`. Backend route supports `GET/HEAD /assets/fonts/:name` and can read `FONT_DIR` or `../web/public/fonts`.

## Recently Fixed Issues

- Fixed Vercel frontend API target confusion: deployed JS had `NEXT_PUBLIC_API_BASE_URL=/api/v1`, so browser requests appeared as `killer.wrenzeal.top/api/v1/*` and Vercel returned 404 because same-origin rewrites were not active. Frontend API resolution now treats relative `/api/v1` as stale on HTTPS and falls back to direct `https://api.killer.wrenzeal.top/api/v1`; docs/env examples now recommend the direct API subdomain.

- Updated the killer certificate renewal workflow for the Vercel migration: `renew-killer-cert.sh` now supports `DOMAINS=` / `DOMAIN=` overrides but defaults to `api.killer.wrenzeal.top`, `/usr/local/bin/renew-killer-cert` and `killer-cert-renew.service/timer` were updated, and backend API cert dry-run succeeded. The previous attempt to renew `killer.wrenzeal.top` failed because that root domain no longer resolves to this nginx host during migration.

- Configured server nginx site `api.killer.wrenzeal.top`: issued Let's Encrypt cert, enabled HTTPS reverse proxy to `127.0.0.1:19304`, HTTP -> HTTPS redirect, production backend CORS for Vercel preview domains, and redeployed backend PM2 process. Verified `https://api.killer.wrenzeal.top/healthz` returns 200 and Vercel-style CORS preflights return 204.

- Prepared frontend for Vercel deployment: added `web/vercel.json`, same-origin `/api/v1` HTTPS behavior, `KTR_BACKEND_ORIGIN` rewrites, backend Vercel preview CORS wildcard support, and docs/env examples for Vercel Root Directory `web`.

- Added engineering hardening: frontend no-dependency Node regression tests, shared preview/PDF resume projection helpers, GitHub Actions CI, backend versioned migrations plus resume content schema/version stamping, and dependency cleanup that removed unused `naive-ui` while upgrading Next.js to `16.2.9`.
- Fixed a Markdown plain-text regression found by the new tests: ordered lists now preserve `1.` / `2.` numbering in `markdownToPlainText`, keeping density/PDF helper paths aligned with preview semantics.

- Fixed basic-info website click targets: preview links and PDF URI annotations now use normalized external `https://...` hrefs while keeping compact visible text, so bare domains no longer open as local/app-relative missing paths.
- Fixed conditional basic-info photo/contact layout: no-photo resumes keep the original compact header with no extra top whitespace, while photo resumes place email/city/website to the left of the direct no-frame photo in both preview and PDF.
- Added a cloud-panel `新建默认简历` action that resets to the default draft and clears the active cloud resume binding, so saving after reset creates a new cloud resume instead of overwriting the loaded one.
- Renamed the work-history achievements field from `战果列表` to `工作内容` in editor/preview/PDF labels while preserving the `work.bullets` JSON key for compatibility.
- Fixed basic-info website overflow in preview/PDF: long website URLs now render inside the contact column with compact display text, two-line preview clamp, and PDF-safe wrapping/truncation.
- Renamed the identity module to `基本信息` / `Basic Info` across navigation, editor, A4 preview, and PDF section titles; the old Chinese `我是谁` wording should not reappear in current UI copy.
- Added basic-info personal photo upload: the image is stored as `draft.identity.photo`, previewed on the A4 header, embedded into vector PDF export, and old drafts get compatible field-layout normalization for the new photo field.
- Increased preview/PDF title hierarchy so module titles, item subtitles, field labels, and skill category headings stand out from resume body text.
- Refined Chinese copy: education console/preview wording is now `教育经历` instead of `求学之路`, and the Chinese professional-skills Markdown display-mode button reads `文档`.
- Fixed professional skill-label empty editing: skill category name inputs now keep empty strings while editing, and default labels are filled only in cloud-save/JSON-export persistence normalization.
- Added professional skills custom categories and renameable built-in categories: `语言`, `前端系统`, `后端/数据`, and `工具链` now use `draft.skills.labels`, user-created categories live in `draft.skills.customCategories[]`, and editor/preview/PDF/density calculations share the same category projection without backend schema changes.
- Aligned live A4 preview footer with vector PDF footer: both now show only target role on the left and `PAGE_XX` on the right, with generator/density footer text removed from preview.
- Added professional skills display controls: the skills module is now titled `专业技能` / `Professional Skills`, supports Markdown vs tag display, one/two-column preview/PDF layout, Enter-generated tag chips, and legacy draft normalization for missing display settings.
- Fixed cloud resume active badge wrapping: the `cloud.active` marker in `CloudResumeDock` uses `inline-flex shrink-0 whitespace-nowrap` so Chinese `当前` and English `active` stay on one line.
- Fixed Markdown ordered-list rendering: `1.` / `2.` now render as numbered items in fullscreen preview, A4 preview, and vector PDF instead of collapsing into unordered bullet dots.
- Fixed cloud loaded-resume refresh persistence: the active cloud resume ID and draft snapshot now live in per-tab `sessionStorage`, so refreshing `/editor` restores the loaded resume without reintroducing long-lived `currentResumeId` persistence.
- Fixed work-history achievements auto-bulleting: plain lines in `work.bullets` now render as Markdown paragraphs in preview/PDF, and only explicit Markdown list syntax becomes bullets; placeholders now instruct users to add `- ` when they want a list.
- Fixed F12/DevTools preview page-count instability: `ResumePreview` now decides one-page vs two-page mode from a hidden fixed-width A4 measurement paper instead of the visible paper size, so resizing the browser/devtools no longer changes page count for the same resume content.
- Fixed cloud resume save semantics: after loading a cloud resume, the primary save action updates the current resume instead of creating a duplicate; a separate save-as-new action creates a new cloud resume, and `currentResumeId` is no longer persisted across browser sessions.
- Added lightweight Markdown editing to fullscreen long-text fields: toolbar actions, source/split/preview modes, real-time A4 preview updates, and PDF readable-text cleanup without adding a project dependency.
- Fixed frontend deploy resilience: `script/deploy-killer-frontend.sh` frees stale port `16639` listeners after PM2 delete so production releases do not leave `kill-the-resume-frontend` in `EADDRINUSE` restart loops.
- Increased editor shell typography for readability across navigation, hero copy, form inputs, buttons, status strips, date controls, cloud/theme/export panels, while keeping A4 preview/PDF resume typography unchanged.
- Rewrote the editor hero description from slogan-heavy copy into user-facing guidance about managing resume content/module order/visibility with live A4 preview.
- Rewrote the cloud resume panel description as user-facing product copy and removed the visible API base URL from the editor UI.
- Fixed left-nav export ordering: the export entry is no longer in the draggable module list, stays fixed above the add-custom-module button, and data normalization/move/add logic keeps `layout.modules` ending with `export`.
- Added custom module support: users can create/delete custom modules, show/hide them, customize field titles/types/values, add text/multiline/date fields, and see changes immediately in preview, JSON export, PDF export, and cloud JSONB persistence without backend schema changes. Built-in modules remain protected from deletion.
- Simplified resume footers to only target role plus `PAGE_XX`, removing generator and density text from both vector PDF export and live A4 preview.
- Added lightweight resume accent themes: fixed presets plus custom color picker, persisted in draft JSON as `theme`, synchronized between live A4 preview, JSON export, and vector PDF export without requiring backend schema changes.
- Updated home entry copy to the resume killer console wording: Chinese description/CTA now read `欢迎来到你的简历杀手控制台。` / `进入控制台`, with English equivalents `Welcome to your resume killer console.` / `Enter console`.
- Moved production backend listener from `127.0.0.1:8080` to `127.0.0.1:19304`, updated nginx upstreams, deploy-script defaults, backend source defaults, frontend direct fallback URLs, PDF font fallback URLs, and kept PM2 as the current Go binary process manager.
- Updated the browser tab brand title: Chinese title is now `Kill The Resume ! 欢迎来到你的简历杀手控制台`, English title is `Kill The Resume ! Welcome to Your Resume Killer Console`, and `LanguageHydrator` scrolls the current-language title in the tab.
- Fixed browser tab metadata localization: title/description now follow the selected Chinese/English language after hydration, SSR defaults to Chinese, `html lang` stays aligned with the preference, and duplicate description meta nodes are removed.
- Fixed cloud resume 401 console spam by clearing expired/legacy persisted JWT sessions before auto-refresh and by clearing auth on authorized-request 401 responses.
- Fixed backend login/auth hardening gaps: generic login failures, dual-key auth rate limiting, stronger JWT validation, security headers, JSON/body guards, and production JWT secret validation.
- Fixed date range picker visual mismatch by replacing native month inputs with a custom Tactical Terminal month picker while preserving structured period data.
- Fixed remote 502 chunk loading / hydration stall by moving PDF export to dynamic import and serving the remote editor with production `next start`; missing chunks mean server HTML appears but React does not hydrate, so buttons cannot respond.
- Fixed `Maximum update depth exceeded` in `ResumePreview` by avoiding ResizeObserver/state feedback loops and using conditional state updates.
- Fixed preview overflow by fitting content inside A4 pages and expanding to a second page when needed.
- Fixed Next.js dev cross-origin warning for remote preview host `38.246.253.179`.
- Optimized the first-version input focus animation seam without changing the animation shape.
- Fixed PDF clipping/strange footer spacing by replacing screenshot/canvas capture with JSON-driven vector drawing and block pagination.
- Fixed PDF font mismatch by sharing paper font assets between `.a4-paper` preview and vector export, with sans/mono/CJK role mapping.
- Fixed PDF content/language mismatch by passing current i18n `t()` into PDF export and reusing preview field ordering/visibility instead of hardcoded English module templates.
- Fixed exported PDF Chinese/text loss by replacing the incomplete CJK font asset and migrating from the fragile jsPDF custom-font path to `pdf-lib` + `@pdf-lib/fontkit` vector generation; current CJK fallback is WenQuanYi Micro Hei, not Unifont or Noto CJK OTF.
- Fixed PDF export content mismatch where bullet newlines were collapsed and some lists/skills were hard-limited; PDF export now preserves bullet lines and avoids silent list/skill truncation.
- Fixed 2026-06-03 PDF work-history bullet spacing: PDF bullets are drawn inside the content inset instead of at the global page margin, and the preview bullet list has matching inner padding/gap so markers no longer collide with the left rail.
- Replaced the CJK paper font with WenQuanYi Micro Hei TrueType for sharper Chinese rendering and stable vector PDF export; Noto Sans CJK SC was rejected for now because split OTF/CFF subsets triggered poppler embedded-font errors.

## Memory Infrastructure

- Durable project memory file: `PROJECT_MEMORY.md`.
- New-session bootstrap rule lives in `AGENTS.md` under `Project Memory Bootstrap`.
- Local skill: `.codex/skills/project-memory/SKILL.md`. Invoke with `$project-memory` when explicitly loading or updating memory.
- Helper script:
  - `python3 .codex/skills/project-memory/scripts/memory.py show` prints memory, pending todo, and recent changes.
  - `python3 .codex/skills/project-memory/scripts/memory.py validate` checks the memory chain invariants.

## Working Rules For Future Sessions

- User prefers Chinese responses.
- Before coding, use `todo_list.md` only for pending operations. Remove completed items after verification.
- After verified changes, append concise bullet points to `CHANGE.md`.
- For frontend changes, verify with the smallest useful set; standard full verification is:
  - `npm --prefix web run test`
  - `npm --prefix web run typecheck`
  - `npm --prefix web run lint`
  - `npm --prefix web run build`
  - `npm --prefix web audit --audit-level=moderate`
- Do not claim completion without fresh verification evidence or an explicit validation gap.
- Backend now exists for accounts and cloud resume persistence; live preview and PDF export still work locally from frontend state without requiring backend.
- GitHub Actions CI lives at `.github/workflows/ci.yml` and mirrors local frontend/backend verification.
- For Vercel frontend deployment, import the GitHub repo with Root Directory `web` and prefer direct browser-to-backend API calls with `NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1`. Optional same-origin rewrites can still use `KTR_BACKEND_ORIGIN=https://api.killer.wrenzeal.top`; direct API subdomain remains the recommended production path unless rewrites are explicitly verified.
- For legacy remote preview/self-hosting, prefer production frontend on port 3000 after `npm --prefix web run build`: run `cd web && ./node_modules/.bin/next start -H 0.0.0.0 -p 3000`. Dev server HMR can temporarily return 502 for `_next/static/chunks`; when chunks fail, React hydration does not complete and all buttons appear unclickable.
- Backend normalizes project/work/education `period` fields on resume create/update so persisted JSONB uses `{ start, end, isPresent }` even when legacy string data is submitted, and stamps resume content with schema/version metadata.
- Backend auth rate limiting is currently in-memory and per process; for multi-instance production, move it to Redis or gateway/WAF-level rate limiting.

- `job-radar-extension/`: standalone Chrome/Edge Manifest V3 extension project for Opportunity Radar. It uses `activeTab`, `scripting`, and `storage` to read the current tab URL/title/selected text after user action, lets the user complete fields and criteria, and posts to `/api/v1/job-radar/import` with a `ktrp_` plugin token generated from the `/job-radar` page. It includes a Chinese README for local installation, permissions, token setup, and development checks.

## Current Verified Status

As of the last update, backend and frontend verification passes. Backend:

```bash
cd backend && go test ./...
cd backend && go build ./cmd/server
```

Frontend:

```bash
npm --prefix web run test
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run build
npm --prefix web audit --audit-level=moderate
```

Audit result: `0 vulnerabilities`.
