# kill-the-resume Backend

Go + Gin + GORM + PostgreSQL backend for accounts and resume persistence.

## Stack

- Go `1.26.x`
- Gin HTTP API
- GORM ORM
- PostgreSQL with application schema `kill_the_resume`
- JWT bearer auth + bcrypt password hashing

## Quick start

```bash
cd backend
cp .env.example .env # 可选：按需修改
DB_PASSWORD=postgres go run ./cmd/server
```

服务默认监听 `:19304`，并连接 Docker 中暴露到本机 `127.0.0.1:5432` 的 PostgreSQL。
启动时会自动执行：

```sql
CREATE SCHEMA IF NOT EXISTS kill_the_resume;
```

随后在该 schema 下创建/迁移：

- `users`
- `resumes`

## Environment

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SERVER_ADDR` | `:19304` | HTTP 监听地址 |
| `DB_HOST` | `127.0.0.1` | PostgreSQL Host |
| `DB_PORT` | `5432` | PostgreSQL 端口 |
| `DB_USER` | `postgres` | PostgreSQL 用户 |
| `DB_PASSWORD` | `postgres` | PostgreSQL 密码 |
| `DB_NAME` | `postgres` | PostgreSQL 数据库 |
| `DB_SCHEMA` | `kill_the_resume` | 应用独立 schema |
| `JWT_SECRET` | dev fallback | JWT 签名密钥，生产必须替换，生产环境至少 32 bytes |
| `JWT_ISSUER` | `kill-the-resume` | JWT `iss` 校验值 |
| `JWT_AUDIENCE` | `kill-the-resume-web` | JWT `aud` 校验值 |
| `JWT_TTL_HOURS` | `168` | 登录 token 有效期，生产建议按风险缩短 |
| `MAX_BODY_BYTES` | `1048576` | JSON 请求体上限，超限返回 `413` |
| `AUTH_RATE_LIMIT_MAX` | `8` | 登录/注册限速窗口内最大尝试次数 |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | `15` | 登录/注册限速窗口分钟数 |
| `CORS_ORIGINS` | localhost dev origins, including 3000/3001/3301/3302 | 前端来源白名单 |

> 如果使用 `DATABASE_URL`，请确保连接串包含正确数据库；当前默认推荐使用上方拆分变量，后端会自动设置 search_path 到 `DB_SCHEMA,public`。


## Security hardening

当前后端登录/鉴权链路包含以下防护：

- 密码使用 bcrypt 哈希保存；注册密码限制为 8-72 bytes，避免 bcrypt 72 bytes 截断风险。
- 登录失败统一返回 `email or password is incorrect`，避免通过错误文案枚举账号。
- 登录和注册使用内存限速，按 `IP` 与 `IP + email` 双维度限制；超限返回 `429` 与 `Retry-After`。
- JWT 仅接受 HS256，并校验 `iss`、`aud`、`exp`、`nbf`；生产环境会拒绝默认/过短 `JWT_SECRET`。
- 鉴权失败统一返回 `authentication required`，并设置 `WWW-Authenticate`。
- 默认安全响应头：`Cache-Control: no-store`、`X-Content-Type-Options: nosniff`、`X-Frame-Options: DENY`、`Content-Security-Policy: frame-ancestors 'none'`、`Referrer-Policy: no-referrer`；生产环境额外设置 HSTS。
- JSON API 要求 `Content-Type: application/json`，并启用请求体大小限制。
- 安全日志只记录邮箱 hash，不记录明文邮箱、密码或 token。

> 当前限速是单进程内存实现，适合当前单实例阶段；多实例/生产集群应迁移到 Redis 或网关级限速，并配合 HTTPS、WAF/反向代理和更完善的审计告警。

## API

Base path: `/api/v1`

### Health

```http
GET /healthz
```

### Auth

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "dev@example.com",
  "password": "password8246",
  "displayName": "Dev User"
}
```

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "dev@example.com",
  "password": "password8246"
}
```

返回：

```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "dev@example.com",
    "displayName": "Dev User",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

### Current user

```http
GET /api/v1/me
Authorization: Bearer <jwt>
```

### Resumes

所有简历接口都需要 `Authorization: Bearer <jwt>`。

```http
GET /api/v1/resumes
```

```http
POST /api/v1/resumes
Content-Type: application/json

{
  "title": "我的技术简历",
  "targetRole": "Frontend Architect",
  "content": {
    "schemaVersion": "kill-the-resume.resume.v1",
    "draft": {}
  }
}
```

```http
GET /api/v1/resumes/:id
PUT /api/v1/resumes/:id
DELETE /api/v1/resumes/:id
```

`content` 使用 `jsonb` 保存完整前端简历草稿；列表接口只返回元数据，详情接口返回完整内容。

## Verification

```bash
go test ./...
go build ./cmd/server
```

## Resume content period fields

The backend stores full resume drafts in `resumes.content` as `jsonb`. Date ranges are stored structurally instead of free text:

```json
{
  "period": {
    "start": "2024-01",
    "end": "",
    "isPresent": true
  }
}
```

- `start`: `YYYY-MM`
- `end`: `YYYY-MM`, empty when `isPresent` is true
- `isPresent`: `true` renders as `至今` / `Present` in preview and PDF export

This shape is used by project experience, work history, and education items. The backend also normalizes legacy string values such as `2023-03 — 至今` into this object shape before writing `resumes.content`.
