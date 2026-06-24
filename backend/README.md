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
- `job_postings`：机会雷达岗位缓存，保留来源、原站链接、发布时间、首次/最近发现时间、过期时间和新鲜度状态。
- `job_search_caches`：机会雷达搜索条件缓存，按岗位关键字、技能、地点、企业性质生成搜索指纹，并保存原始条件 JSON 与最近同步时间。
- `job_search_results`：机会雷达搜索结果关联表，把某个搜索指纹与真实岗位缓存关联，避免不同关键词共用同一批全局岗位。
- `job_radar_preferences`：登录用户的机会雷达搜索条件偏好，每个用户一条，保存最近一次查询条件和对应搜索指纹。
- `job_radar_plugin_tokens`：机会雷达浏览器采集插件专用 Token，只存 SHA-256 hash，支持过期、撤销和最近使用时间。

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
| `JOB_RADAR_SYNC_ENABLED` | `true` | 是否在查询机会雷达时按缓存新鲜度触发真实岗位源同步 |
| `JOB_RADAR_SYNC_INTERVAL_MINUTES` | `360` | 机会雷达按“搜索指纹”同步的间隔；默认每组搜索条件最多 6 小时按需抓取一次，符合 Remotive 官方“不高频请求”的公开 API 使用建议 |
| `JOB_RADAR_HTTP_TIMEOUT_SECONDS` | `10` | 拉取招聘数据源的 HTTP 超时 |
| `JOB_RADAR_MAX_RESULTS` | `80` | 机会雷达接口返回的最大匹配岗位数 |
| `JOB_RADAR_REMOTIVE_URL` | `https://remotive.com/api/remote-jobs` | Remotive 公开岗位 API 地址，可在测试中替换为 stub |

> 如果使用 `DATABASE_URL`，请确保连接串包含正确数据库；当前默认推荐使用上方拆分变量，后端会自动设置 search_path 到 `DB_SCHEMA,public`。


## Security hardening

当前后端登录/鉴权链路包含以下防护：

- 密码使用 bcrypt 哈希保存；注册密码限制为 8-72 bytes，避免 bcrypt 72 bytes 截断风险。
- 登录失败统一返回 `email or password is incorrect`，避免通过错误文案枚举账号。
- 登录和注册使用内存限速，按 `IP` 与 `IP + email` 双维度限制；超限返回 `429` 与 `Retry-After`。
- JWT 仅接受 HS256，并校验 `iss`、`aud`、`exp`、`nbf`；生产环境会拒绝默认/过短 `JWT_SECRET`。
- 机会雷达浏览器插件使用 `ktrp_` 开头的专用 Token；后端只存 hash，专用 Token 只被 `/api/v1/job-radar/import` 接受，不能访问 `/resumes`、`/me` 或偏好接口。
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

### Opportunity Radar / Job Radar

```http
GET /api/v1/job-radar/jobs?keywords=Frontend&requiredSkills=TypeScript&locations=Remote&minScore=45
GET /api/v1/job-radar/jobs?keywords=Backend&requiredSkills=Go&refresh=1
```

该接口会先用岗位关键字、技术关键词、地点、企业性质生成 `searchFingerprint`，再只读取该搜索范围关联的岗位缓存；新关键词（例如从 Frontend 切到 Backend）会创建新的搜索缓存并按需从 Remotive 公开 API 抓取，而不是复用上一组全局缓存。`excludeKeywords` 与 `minScore` 只影响本地过滤/排序，不会制造新的抓取范围；`refresh=1` / `forceRefresh=true` 会强制访问 Remotive 线上岗位源，并用本次源站返回结果替换当前搜索范围关联，源站不可用时返回 `502`，不再静默回退旧缓存。响应示例：

```json
{
  "jobs": [
    {
      "sourceName": "Remotive",
      "sourceJobId": "2090887",
      "sourceUrl": "https://remotive.com/remote-jobs/...",
      "title": "React Engineer",
      "matchPercent": 86,
      "matchTags": [{ "kind": "skill", "label": "TypeScript" }],
      "warningTags": [],
      "freshnessStatus": "hot",
      "postedAt": "2026-06-19T19:46:09Z",
      "firstSeenAt": "2026-06-22T00:00:00Z",
      "lastSeenAt": "2026-06-22T00:00:00Z",
      "expiresAt": "2026-08-03T19:46:09Z"
    }
  ],
  "policy": {
    "hotWithinDays": 7,
    "normalWithinDays": 30,
    "staleWithinDays": 45,
    "deleteAfterDays": 60
  },
  "meta": {
    "sourceName": "Remotive",
    "searchFingerprint": "remotive:7b4d1a6f9e...",
    "searchQuery": "Frontend TypeScript Remote",
    "cachedCount": 30,
    "expiredCount": 0,
    "expiredDeleted": 0,
    "cacheHit": false,
    "forceRefresh": true,
    "fetchedCount": 42,
    "upsertedCount": 42,
    "linkedCount": 30,
    "syncedAt": "2026-06-22T06:00:00Z",
    "lastSyncedAt": "2026-06-22T06:00:00Z"
  }
}
```

数据源合规约束：当前只接入 Remotive 公开 API，不抓取招聘网站页面；前端必须展示 `sourceName` 并把岗位标题/原站按钮链接到 `sourceUrl`，为 Remotive 导流。Remotive 官方文档说明公开 API 用于开发者分享岗位，要求标注来源和回链，且不应高频请求；默认每个搜索指纹最多 6 小时同步一次，避免超过其建议频率。

登录用户还可以把招聘网站或公司官网中的真实岗位手动/插件导入当前搜索范围。该导入接口接受两种凭证：主站登录 JWT，或`/job-radar` 页面生成的 `ktrp_` 机会雷达插件专用 Token；插件专用 Token 只允许调用此导入接口。

```http
POST /api/v1/job-radar/import
Authorization: Bearer <jwt-or-ktrp-plugin-token>
Content-Type: application/json

{
  "sourceName": "Boss直聘",
  "sourceUrl": "https://www.zhipin.com/job_detail/example.html",
  "title": "后端开发工程师",
  "companyName": "天津示例科技",
  "companyNature": "产品团队",
  "location": "天津",
  "salary": "20-30K",
  "rawText": "岗位职责和要求原文...",
  "criteria": {
    "keywords": ["Backend"],
    "locations": ["Tianjin"],
    "requiredSkills": ["Golang", "Java"],
    "excludeKeywords": ["外包", "驻场"],
    "minScore": 50
  }
}
```

导入接口会生成稳定 `sourceJobId`，写入 `job_postings`，并关联到 `criteria` 对应的 `job_search_results`；如果 `criteria` 没有岗位关键字、地点、企业性质或技能等搜索范围字段，后端会使用已认证用户在 `/job-radar` 保存的最新搜索条件，确保浏览器插件默认导入后能出现在当前雷达列表中。响应返回该岗位在当前条件下的 `matchPercent`、标签与 `searchFingerprint`。导入写入会把该搜索范围标记为已同步，避免刚导入后下一次非强制查询立即触发远端同步并替换掉手动导入岗位；用户仍可点击 `refresh=1` 主动刷新线上源。

插件 Token 管理接口需要正常登录 JWT，用于在 `/job-radar` 机会雷达页面生成、查看和撤销插件 Token。`token` 明文只在创建响应中返回一次，列表接口只返回元数据：

```http
GET /api/v1/job-radar/plugin-tokens
Authorization: Bearer <jwt>
```

```http
POST /api/v1/job-radar/plugin-tokens
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Chrome Job Radar Collector",
  "expiresInDays": 90
}
```

```json
{
  "token": "ktrp_...",
  "meta": {
    "id": "...",
    "name": "Chrome Job Radar Collector",
    "expiresAt": "2026-09-21T12:00:00Z",
    "createdAt": "2026-06-23T12:00:00Z",
    "updatedAt": "2026-06-23T12:00:00Z"
  }
}
```

```http
DELETE /api/v1/job-radar/plugin-tokens/{id}
Authorization: Bearer <jwt>
```

登录用户的机会雷达搜索条件可保存到账户；前端会在查询时调用保存接口，并在下次进入页面时恢复：

```http
GET /api/v1/job-radar/preferences
Authorization: Bearer <jwt>
```

```http
PUT /api/v1/job-radar/preferences
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "criteria": {
    "keywords": ["Backend", "Go"],
    "locations": ["Remote"],
    "companyNatures": ["Startup"],
    "requiredSkills": ["PostgreSQL"],
    "excludeKeywords": ["Onsite"],
    "minScore": 50
  }
}
```

响应包含规范化后的 `criteria` 以及 `searchFingerprint`、`searchQuery`、`updatedAt` 元数据；未登录用户仍可使用公开岗位查询，但不会持久化搜索条件。

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
