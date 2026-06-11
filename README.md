<p align="center">
  <img src="./web/public/favicon.svg" alt="Kill The Resume 战术终端项目图标" width="96" height="96" />
</p>

<h1 align="center">Kill The Resume</h1>

<p align="center">
  面向开发者与极客的战术终端风格在线简历编辑器。
</p>

<p align="center">
  <a href="./README.md">中文</a> · <a href="./README.en.md">English</a>
</p>

## 项目图标

当前浏览器标签图标就是 Kill The Resume 的项目图标，源码位于 [`web/public/favicon.svg`](./web/public/favicon.svg)。它采用暗色战术终端底板、赛博绿/追踪青/警戒橙定位框、被撕裂的简历纸张、红色 kill slash 和 `KTR` 标记，表达“终结传统静态简历，把简历变成个人核心数据控制台”的产品方向。

## 项目定位

Kill The Resume 不是普通表单式简历生成器，而是一个面向技术人群的结构化简历控制台：

- 用 JSON 化数据管理简历内容；
- 实时同步右侧 A4 预览；
- 支持模块排序、显隐和自定义模块；
- 支持中英文 UI 偏好；
- 支持云端账号、简历保存、加载与删除；
- 支持结构化日期、Markdown 长文本、专业技能标签/文档模式；
- 支持个人照片、主题色、JSON 导出和矢量 PDF 导出。

## 技术栈

| 区域 | 技术 |
| --- | --- |
| 前端 | Next.js 16 App Router, React 19, TypeScript 6, Tailwind CSS 4, Zustand |
| PDF 导出 | `pdf-lib` + `@pdf-lib/fontkit`，JSON 驱动的矢量 PDF，不使用截图/canvas 导出 |
| 后端 | Go 1.26, Gin, GORM, PostgreSQL |
| 账号与持久化 | bcrypt 密码哈希、JWT Bearer token、PostgreSQL JSONB 简历内容 |
| 工程化 | Node 原生测试、ESLint、TypeScript、Go test/build、GitHub Actions CI |

## 仓库结构

```txt
web/      Next.js 编辑器、实时 A4 预览、JSON/PDF 导出
backend/  Go + Gin + GORM + PostgreSQL API
script/   生产部署与证书续期脚本
.github/  GitHub Actions CI
```

关键文件：

- [`web/src/app/editor/page.tsx`](./web/src/app/editor/page.tsx)：编辑器入口；
- [`web/src/components/editor/ResumePreview.tsx`](./web/src/components/editor/ResumePreview.tsx)：实时 A4 预览；
- [`web/src/lib/resume-pdf.ts`](./web/src/lib/resume-pdf.ts)：矢量 PDF 导出；
- [`web/src/lib/resume-projection.ts`](./web/src/lib/resume-projection.ts)：预览/PDF 共享简历投影规则；
- [`backend/internal/httpx/router.go`](./backend/internal/httpx/router.go)：后端 API 路由；
- [`backend/internal/httpx/resume_content.go`](./backend/internal/httpx/resume_content.go)：简历 JSON 规范化；
- [`DESIGN.md`](./DESIGN.md)：产品与视觉决策源。

## 快速启动

### 前端

```bash
npm --prefix web install
npm run web:dev
```

打开：

```txt
http://localhost:3000/editor
```

### 后端

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

默认 API：

```txt
http://127.0.0.1:19304/api/v1
```

前端 API 配置模板见 [`web/.env.example`](./web/.env.example)，后端配置模板见 [`backend/.env.example`](./backend/.env.example)。真实 `.env` / `.env.local` 文件不会提交到仓库。

## 常用验证命令

### 前端

```bash
npm run web:test
npm run web:typecheck
npm run web:lint
npm run web:build
npm --prefix web audit --audit-level=moderate
```

### 后端

```bash
npm run backend:test
npm run backend:build
```

## CI

仓库包含 [`GitHub Actions CI`](./.github/workflows/ci.yml)，在 push / pull request 时验证：

- 前端 `npm ci`、test、typecheck、lint、build、audit；
- 后端 `go test ./...` 与 `go build ./cmd/server`。

## 生产部署概览

当前部署脚本位于 [`script/`](./script)：

- `deploy-killer-frontend.sh`
- `deploy-killer-backend.sh`
- `start-killer-backend.sh`
- `renew-killer-cert.sh`

根目录快捷命令：

```bash
npm run deploy:killer:frontend
npm run deploy:killer:backend
npm run deploy:killer
```

生产站点当前使用 nginx + PM2：前端 Next.js 服务经 nginx 代理，后端 Go API 监听 `127.0.0.1:19304`。

## 维护原则

- 保持战术终端视觉语言一致，除非明确要求重设计；
- PDF 导出继续走 JSON 驱动矢量绘制，不回退到截图/canvas；
- 预览与 PDF 的高风险格式化规则应优先复用 `resume-projection.ts`；
- 修改前端行为时优先补/更新 `web/test/` 回归测试；
- 完成有意义变更后更新 `CHANGE.md`、`PROJECT_MEMORY.md` 和 `todo_list.md`。
