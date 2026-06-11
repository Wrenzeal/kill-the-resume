<p align="center">
  <img src="./web/public/favicon.svg" alt="Kill The Resume tactical project icon" width="96" height="96" />
</p>

<h1 align="center">Kill The Resume</h1>

<p align="center">
  A tactical terminal-style online resume editor for developers and geeks.
</p>

<p align="center">
  <a href="./README.md">中文</a> · <a href="./README.en.md">English</a>
</p>

## Project Icon

The current browser-tab favicon is also the project icon for Kill The Resume. Its source lives at [`web/public/favicon.svg`](./web/public/favicon.svg). The icon combines a dark tactical terminal tile, cyber-green / trace-cyan / warning-orange targeting brackets, a torn resume document, a red kill slash, and the `KTR` mark. It represents the product idea: kill the traditional static resume and turn the resume into a personal core data console.

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

Deployment scripts live under [`script/`](./script):

- `deploy-killer-frontend.sh`
- `deploy-killer-backend.sh`
- `start-killer-backend.sh`
- `renew-killer-cert.sh`

Root shortcuts:

```bash
npm run deploy:killer:frontend
npm run deploy:killer:backend
npm run deploy:killer
```

The current production shape uses nginx + PM2: nginx proxies the Next.js frontend, while the Go backend listens on `127.0.0.1:19304`.

## Maintenance Principles

- Preserve the tactical terminal visual language unless a redesign is explicitly requested;
- keep PDF export JSON-driven and vector-based; do not regress to screenshot/canvas export;
- route high-risk preview/PDF formatting rules through `resume-projection.ts` where possible;
- update or add `web/test/` regression tests when changing frontend behavior;
- after meaningful verified changes, update `CHANGE.md`, `PROJECT_MEMORY.md`, and `todo_list.md`.
