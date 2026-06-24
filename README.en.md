<h1 align="center">Kill The Resume</h1>

<p align="center">
  A tactical terminal-style online resume editor for developers and geeks.
</p>

<p align="center">
  <a href="./README.md">中文</a> · <a href="./README.en.md">English</a>
</p>

## Product Direction

Kill The Resume is not a conventional form-based resume generator. It is a structured resume command console for technical users:

- manage resume content as JSON-like structured data;
- sync edits into a live A4 preview;
- reorder, hide, show, and extend resume modules;
- support Chinese and English UI preferences;
- support accounts plus cloud resume save, load, and delete;
- support structured date ranges, Markdown long-form fields, and professional-skills document/tag modes;
- support profile photos, accent themes, JSON export, and vector PDF export.

## Tech Stack

| Area | Tech |
| --- | --- |
| Frontend | Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Zustand |
| PDF export | `pdf-lib` + `@pdf-lib/fontkit`; JSON-driven vector PDF, no screenshot/canvas export |
| Backend | Go 1.26, Gin, GORM, PostgreSQL |
| Auth & persistence | bcrypt password hashes, JWT Bearer tokens, PostgreSQL JSONB resume content |
| Engineering | Node native tests, ESLint, TypeScript, Go test/build, GitHub Actions CI |

## Repository Layout

```txt
web/      Next.js editor, live A4 preview, JSON/PDF export
backend/  Go + Gin + GORM + PostgreSQL API
script/   production deployment and certificate-renewal scripts
.github/  GitHub Actions CI
```

Key files:

- [`web/src/app/editor/page.tsx`](./web/src/app/editor/page.tsx): editor entry;
- [`web/src/components/editor/ResumePreview.tsx`](./web/src/components/editor/ResumePreview.tsx): live A4 preview;
- [`web/src/lib/resume-pdf.ts`](./web/src/lib/resume-pdf.ts): vector PDF export;
- [`web/src/lib/resume-projection.ts`](./web/src/lib/resume-projection.ts): shared preview/PDF resume projection rules;
- [`backend/internal/httpx/router.go`](./backend/internal/httpx/router.go): backend API routes;
- [`backend/internal/httpx/resume_content.go`](./backend/internal/httpx/resume_content.go): resume JSON normalization;
- [`DESIGN.md`](./DESIGN.md): product and visual decision source.

## Quick Start

### Frontend

```bash
npm --prefix web install
npm run web:dev
```

Open:

```txt
http://localhost:3000/editor
```

### Backend

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

Default API:

```txt
http://127.0.0.1:19304/api/v1
```

Frontend API configuration lives in [`web/.env.example`](./web/.env.example). Backend configuration lives in [`backend/.env.example`](./backend/.env.example). Real `.env` / `.env.local` files are intentionally ignored.

## Common Verification Commands

### Frontend

```bash
npm run web:test
npm run web:typecheck
npm run web:lint
npm run web:build
npm --prefix web audit --audit-level=moderate
```

### Backend

```bash
npm run backend:test
npm run backend:build
```

## CI

The repository includes [`GitHub Actions CI`](./.github/workflows/ci.yml). It validates on push / pull request:

- frontend `npm ci`, test, typecheck, lint, build, and audit;
- backend `go test ./...` and `go build ./cmd/server`.

## Production Deployment Overview

The recommended production shape is now a Vercel-hosted frontend plus an external Go API backend, which can still run on your own server behind PM2/nginx.

### Vercel frontend

When importing this GitHub repository into Vercel, set **Root Directory** to `web` and use the Next.js build configuration in [`web/vercel.json`](./web/vercel.json).

Recommended environment variables:

```txt
NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1
```

`NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1` makes browser API calls go directly to the backend API subdomain, so the Network panel should show `api.killer.wrenzeal.top`. `web/next.config.ts` still keeps optional rewrite support, but the recommended production path is the direct API subdomain to avoid same-origin `/api/v1` 404s when Vercel rewrites are not active.

### Backend

The backend can still be deployed to a server with [`script/deploy-killer-backend.sh`](./script/deploy-killer-backend.sh). After deployment, expose it through an HTTPS origin, for example:

```txt
https://api.example.com
```

Backend `CORS_ORIGINS` now defaults to local dev origins plus `https://*.vercel.app`; after binding a custom frontend domain, prefer adding that exact origin too, for example:

```txt
CORS_ORIGINS=https://your-frontend.example.com,https://*.vercel.app,http://localhost:3000,http://127.0.0.1:3000
```

The old self-hosted frontend deployment scripts remain under [`script/`](./script) for rollback or self-hosting scenarios.

## Maintenance Principles

- Preserve the tactical terminal visual language unless a redesign is explicitly requested;
- keep PDF export JSON-driven and vector-based; do not regress to screenshot/canvas export;
- route high-risk preview/PDF formatting rules through `resume-projection.ts` where possible;
- update or add `web/test/` regression tests when changing frontend behavior;
- after meaningful verified changes, update `CHANGE.md`, `PROJECT_MEMORY.md`, and `todo_list.md`.
