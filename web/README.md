# kill-the-resume web

Frontend app for kill-the-resume.

## Run

```bash
npm run dev
```

Then open `http://localhost:3000/editor`.

From the repository root, you can also run:

```bash
npm run web:dev
```

## Remote/server access

The dev server binds to `0.0.0.0` so it can be opened from a server IP. If you see a Next.js `allowedDevOrigins` warning after changing the host/IP, add that host to `next.config.ts` and restart the dev server.

## Backend API

The editor cloud-resume panel calls the Go backend through:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:19304/api/v1
```

Start backend from the repository root with:

```bash
npm run backend:dev
```

Then start frontend with `npm run web:dev` and open `/editor`.

### Remote API host

远程访问时不要使用 `127.0.0.1` 作为浏览器 API 地址；那会指向用户自己的电脑。
如果没有配置 `NEXT_PUBLIC_API_BASE_URL`，前端会按当前页面主机自动推导：

```txt
http://<当前前端访问主机>:19304/api/v1
```

例如从 `http://<server-ip>:3000/editor` 打开时，会请求：

```txt
http://<server-ip>:19304/api/v1
```
