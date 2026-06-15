# kill-the-resume web

Frontend app for kill-the-resume.

## Run locally

```bash
npm run dev
```

Then open `http://localhost:3000/editor`.

From the repository root, you can also run:

```bash
npm run web:dev
```

The dev server binds to `0.0.0.0` so it can be opened from a server IP. If you see a Next.js `allowedDevOrigins` warning after changing the host/IP, set `NEXT_ALLOWED_DEV_ORIGINS` and restart the dev server.

## Backend API

Local development can leave `NEXT_PUBLIC_API_BASE_URL` empty. The browser API base is resolved as follows:

- localhost frontend: `http://127.0.0.1:19304/api/v1`;
- remote HTTP frontend, such as `http://<server-ip>:3000/editor`: `http://<server-ip>:19304/api/v1`;
- HTTPS frontend, such as Vercel: same-origin `/api/v1`.

Start backend from the repository root with:

```bash
npm run backend:dev
```

## Vercel deployment

Use this directory as the Vercel project root:

```txt
Root Directory: web
Framework: Next.js
```

`web/vercel.json` pins the Vercel commands to `npm ci`, `npm run build`, and `npm run dev`.

Recommended Vercel environment variables:

```txt
NEXT_PUBLIC_API_BASE_URL=/api/v1
KTR_BACKEND_ORIGIN=https://<your-public-backend-origin>
```

With `KTR_BACKEND_ORIGIN` set, `next.config.ts` rewrites same-origin `/api/v1/*`, `/healthz`, and `/assets/fonts/*` requests to the external Go backend. If you intentionally want direct browser-to-backend requests instead of rewrites, set `NEXT_PUBLIC_API_BASE_URL=https://<backend-origin>/api/v1` and make sure the backend `CORS_ORIGINS` includes the Vercel/custom frontend origin.
