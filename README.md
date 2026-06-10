# kill-the-resume

A tactical resume editor for developers. The project contains a Next.js frontend and a Go backend for account/resume persistence.

## Project layout

```txt
web/      Next.js editor, live A4 preview, JSON/PDF export
backend/  Go + Gin + GORM + PostgreSQL API
script/   optional deployment/maintenance scripts
```

## Frontend

```bash
npm --prefix web install
npm --prefix web run dev
```

Open `http://localhost:3000/editor`.

Useful checks:

```bash
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run build
```

## Backend

```bash
cd backend
cp .env.example .env
DB_PASSWORD=postgres go run ./cmd/server
```

Useful checks:

```bash
cd backend
go test ./...
go build ./cmd/server
```

## Environment files

Real `.env` / `.env.local` files are intentionally ignored. Use `backend/.env.example` and `web/.env.example` as templates.
