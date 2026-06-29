# CHANGE

- 新增 Next.js 16 App Router 项目骨架：`package.json`、`next.config.ts`、`tsconfig.json`、ESLint flat config、PostCSS/Tailwind v4 配置与 `src/app` 根布局。
- 新增 `/editor` 三栏战术终端界面：左侧 16rem 战术导航锚点、中间滚动编辑控制台、右侧 500px+ A4 实时预览沙盒，整体 `h-screen overflow-hidden`。
- 新增 `ProjectExperienceConsole` 客户端项目经验输入块：直角数据卡片、Monospace 大写状态标题、霓虹聚焦细线扫描、状态切换、字符密度与预览延迟遥测。
- 新增 Zustand 驱动的简历草稿状态：项目经验字段输入会即时更新右侧 A4 预览，实现数据与表现分离的 JSON 驱动结构。
- 新增 `ResumePreview` 白底 A4 画布：暗色背景悬浮、`shadow-2xl shadow-black`、项目状态点、密度压缩提示与轻量“挤一挤”动效。
- 新增全局 Tactical Terminal 视觉系统：暗黑控制台网格、Cyber Green / Warning Orange / Trace Cyan 变量、focus glow、scanline、压缩 pulse、`prefers-reduced-motion` 降级。
- 新增 `DESIGN.md` 作为 UI/UX 决策源：记录品牌、视觉语言、信息架构、组件状态、可访问性与阶段性约束。
- 验证通过：`npm run typecheck`、`npm run lint`、`npm run build`、`npm audit --audit-level=moderate`，当前审计结果为 0 vulnerabilities。

- 调整为前后端分离目录结构：Next.js 前端已整体迁移至 `web/`，根目录保留给未来后端与顶层工作区配置。
- 新增根目录代理脚本：`npm run web:dev`、`web:build`、`web:lint`、`web:typecheck`、`web:start`，方便从仓库根目录启动/验证前端。
- 新增 `web/README.md`，记录前端独立启动方式与 `/editor` 访问入口。
- 迁移后验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 新增中英文语言切换：默认中文，首页与编辑器状态栏提供 `中 / EN` 战术按钮。
- 新增用户级语言偏好持久化：使用 Zustand + `localStorage` 保存选择，刷新后保留用户语言。
- 新增前端轻量 i18n 字典与 `useI18n`：导航、状态遥测、编辑器标题、项目经验表单、密度/状态标签、A4 预览外壳已支持中文/英文切换。
- 更新 `DESIGN.md`：明确中文默认、英文可选、多用户语言偏好的前端约束。
- 语言切换后验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 左侧导航按钮已从占位锚点升级为真实模块切换：核心身份、项目经验、工作履历、技能矩阵、教育经历、导出协议均可点击切换编辑面板。
- 扩展前端简历状态模型：新增身份、工作、技能、教育、导出协议等数据结构，并统一通过 Zustand 更新。
- 新增模块化编辑控制台：`ResumeModuleConsoles`、`ModuleShell`、`ModuleTelemetry`、`TacticalTextField` 复用当前 Tactical Console UI/UX 风格。
- A4 实时预览已改为消费完整简历状态：修改任意模块字段都会即时反映到右侧预览，包括姓名、联系方式、摘要、工作履历、技能、教育和目标岗位。
- 模块与预览联动验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复远程 IP 访问 Next.js dev 时的跨域开发源 warning：`web/next.config.ts` 已加入 `allowedDevOrigins: ["38.246.253.179"]`。
- 前端开发服务器脚本调整为 `next dev -H 0.0.0.0`，便于通过服务器 IP 访问 `/editor`。
- 修复 A4 实时预览内容超出白色纸张的问题：预览容器现在 `overflow: hidden` 并启用基于 `ResizeObserver` 的内部自适应缩放。
- 优化右侧预览排版密度：缩小内边距、标题字号、段落行高与模块间距，并显示 FIT 百分比方便判断当前压缩比例。
- A4 预览修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 新增简历布局 schema：`ResumeDraft.layout` 记录模块顺序/显隐与各模块字段顺序/显隐，后续可直接持久化到后端。
- 左侧导航支持拖拽排序与模块显隐：用户可调整项目经验、工作履历、技能等模块在预览中的展示顺序，也可隐藏不需要的模块。
- 支持可重复模块新增：项目经验、工作履历、教育经历可从左侧或模块面板新增条目，并实时出现在编辑区和 A4 预览中。
- 新增字段布局控制：每个模块底部提供字段上移/下移与显示/隐藏控制，字段顺序和显隐会实时影响表单与预览。
- A4 预览升级为最多两页自动排版：内容压缩低于阈值时自动拆为双页展示，最多两页，继续过量时保留风险提示和压缩显示。
- 核心简历制作能力验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复 `ResumePreview` 自动缩放导致的 `Maximum update depth exceeded`：缩放测量改为 `requestAnimationFrame` 节流，并仅在比例实际变化时更新状态。
- 移除预览测量 effect 对页数状态的循环依赖，避免 ResizeObserver 与 React state 互相触发无限渲染。
- 缩放循环修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 恢复输入框 focus 原本的单束霓虹扫光视觉：移除 `repeating-linear-gradient` 分段循环，避免出现“一段彩色一段黑色”的视觉割裂。
- 输入框扫描层改为双层错峰线性扫光：主扫光保持原有能量流转，低透明度 ghost sweep 掩盖循环重置断点，让聚焦动画更连续。
- 输入动画回归验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 按用户要求回退输入框 focus 动画到第一版效果：保留单个 `::before` 扫描层、普通 `linear-gradient` 与 `1.75s` 背景位移扫光。
- 移除上一版双层错峰/ghost sweep 方案，恢复最初更直接的极客终端输入聚焦视觉。
- 输入动画回退验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 在不改变第一版输入框 focus 动画形态的前提下优化循环断点：保持单层 `linear-gradient`、`1.75s` 动画与原 keyframes，仅禁用背景重复来避免重置时出现可见接缝。
- 为第一版扫光层补充 `will-change: background-position, opacity`，降低动画重绘抖动风险。
- 输入动画断点优化验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 新增 repo-native 项目记忆模块：`PROJECT_MEMORY.md` 记录当前产品方向、前端架构、已实现功能、视觉决策、已修复问题与标准验证命令。
- 在 `AGENTS.md` 增加新会话记忆启动规则：后续新对话进入仓库后需先读取 `PROJECT_MEMORY.md`，再查看 `todo_list.md` 与 `CHANGE.md` 最新记录。
- 新增本地 `$project-memory` skill：提供跨会话记忆加载/更新流程，并附带 `memory.py show|validate` 辅助脚本。
- 记忆模块验证通过：`python3 .codex/skills/project-memory/scripts/memory.py validate`、`python3 .codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/project-memory`。
- 前端回归验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 新增前端简历导出执行单元：`ResumeExportActions` 支持浏览器打印/另存为 PDF，以及完整结构化 JSON 载荷下载。
- 导出协议模块已接入导出按钮，并在顶部状态栏增加紧凑 PDF/JSON 快捷入口，保持 Tactical Console 视觉风格。
- 新增打印专用 CSS：打印时隐藏编辑器控制台，只输出右侧 A4 简历页，支持最多两页的分页打印。
- JSON 导出载荷增加 schema 标识 `kill-the-resume.resume.v1`、导出时间、生成器信息与完整 `draft` 数据，便于后续恢复或提交后端。
- 明确当前导出阶段无需后端；后端仅在账号、云端保存、分享链接、服务端 PDF 队列等能力启动时接入。
- 导出功能验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复 PDF 导出与右侧预览不一致的问题：打印前读取当前预览纸张宽高，并写入 `--resume-print-source-*` CSS 变量作为导出源坐标系。
- 打印 CSS 改为将预览坐标系等比映射到物理 A4，保留右侧预览中的 `scaleY` 压缩结果，避免导出 PDF 下方出现大面积空白。
- 打印时直接移除左侧导航与中间编辑控制台的布局占位，只保留 A4 纸张节点参与打印分页。
- PDF 预览一致性修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复 PDF 导出只能输出第一页的问题：打印根节点从绝对定位恢复为普通文档流，避免后续 A4 页被裁剪。
- 打印样式将每个 `[data-resume-paper]` 作为独立 A4 分页块，并使用 `break-after: page` / `page-break-after: always` 输出多页内容。
- 打印时强制移除双页预览父级缩放与隐藏溢出上下文，确保第二页简历内容参与浏览器打印分页。
- 多页 PDF 导出修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复 PDF 仍只能输出单页/后续内容截断的问题：新增独立打印镜像层 `data-resume-print-document`，打印时不再直接使用右侧可视预览容器。
- 打印镜像层为每张简历页生成独立 `[data-resume-print-page]` A4 文档流块，彻底避开可视预览的 `overflow-hidden`、父级缩放和布局裁剪。
- 打印 CSS 改为隐藏屏幕预览，只显示打印镜像文档；双页内容通过独立 A4 块自然进入浏览器打印分页。
- 页数判断增加密度兜底：当内容达到 critical 且模块数大于 1 时，即使测量状态尚未触发，也会生成第二张打印页。
- 打印镜像多页导出修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- PDF 导出改为插件式生成：新增 `html2canvas` 与 `jspdf` 依赖，不再依赖浏览器原生打印分页。
- `ResumeExportActions` 现在会逐页捕获专用 A4 导出层 `[data-resume-print-page]`，再用 jsPDF 合成多页 PDF，避免后续内容被浏览器打印裁剪。
- 导出镜像层在正常 UI 中保持屏幕外隐藏，PDF 生成时临时移入视口供 html2canvas 捕获，生成完成后恢复隐藏状态。
- 导出按钮增加生成中状态与失败状态，中英文文案同步更新。
- 插件式 PDF 导出验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复点击 PDF 导出时报 `Attempting to parse an unsupported color function "lab"` 的问题：新增 canvas-safe 导出克隆层。
- PDF 逐页截图前会递归复制并净化导出页样式，把 html2canvas 不支持的 `lab()/oklab()/lch()/oklch()` 颜色、阴影等替换为安全的 `rgb/rgba/transparent` 值。
- 导出净化逻辑只作用于临时克隆节点，不影响正常编辑器 UI 与右侧预览视觉。
- html2canvas 颜色兼容修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复插件式 PDF 仍可能只有一页的问题：PDF 导出镜像页数与右侧预览页数解耦。
- 当可见模块超过 1 个时，PDF 导出镜像固定生成两张 A4（最多两页），避免教育经历等后续模块被压入第一页后在截图时裁掉。
- 导出时增加控制台页数日志：`[kill-the-resume] exporting N PDF page(s)`，便于确认 jsPDF 实际捕获页数。
- PDF 导出页数解耦修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- PDF 导出从 html2canvas 截图捕获改为 jsPDF 按 `ResumeDraft` JSON 直接矢量绘制文本、分割线、分页和页脚，导出不再依赖截图路径。
- 新增 `web/src/lib/resume-pdf.ts`：按模块/条目拆分为可分页绘制块，最多两页，页脚固定贴近 A4 底部，整体内容过密时按两页物理容量做有限压缩，避免截断和异常大底部空白。
- 新增 `web/public/fonts/ktr-vector-gothic.ttf` 作为 PDF 矢量字体资产，支持默认中文内容在 jsPDF 文本绘制中输出，保持非截图式 PDF。
- 清理旧截图导出路径：移除 `ResumePreview` 隐藏打印镜像、移除全局 CSS 中过时的打印坐标变量，并卸载直接 `html2canvas` 依赖；`ResumeExportActions` 改为等待矢量 PDF 生成。
- 矢量 PDF 导出修复验证通过：中文字体注册 smoke 生成 `/tmp/ktr-vector-smoke.pdf`；`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 对齐 PDF 导出与右侧 A4 预览的字体体系：新增 paper 专用 sans/mono/CJK 字体资产，并让 `.a4-paper` 预览与 jsPDF 导出共用同一套字体角色。
- `resume-pdf.ts` 改为按文本角色绘制字体：正文/主标题使用 sans，战术标签、元信息、页脚和技能矩阵使用 mono，中文内容按字符段切换到 CJK fallback，避免全局单一 Gothic 导致导出字体观感偏离预览。
- 字体一致性修复验证通过：`/tmp/ktr-font-role-smoke.pdf` 成功注册 sans/mono/CJK normal/bold；`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 修复 PDF 导出内容缺失与语言混用：`exportResumePdf` 现在接收当前 `t()` 翻译函数，模块标题、字段标签和页脚文案跟随中英文切换。
- PDF 矢量绘制改为复用右侧预览的字段协议：按 `getOrderedFields` 的字段顺序/显隐绘制字段列表、bullet 列表、技能矩阵、导出协议，不再用硬编码英文模块标题或特化字段合并导致内容丢失。
- PDF 页脚从硬编码 `JSON DRIVEN...` 改为和预览一致的 `preview.footerPrefix / footerDensity / exportTarget` 文案，导出结果与当前预览语言保持一致。
- 导出一致性修复验证通过：确认 `resume-pdf.ts` 不再包含硬编码英文模块标题；`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`。
- 诊断并修复导出 PDF 文字/内容缺失：旧 CJK 字体资产缺少多组中文 glyph，且 jsPDF 自定义字体链路对中英文混排不够稳定。
- 将 `web/public/fonts/ktr-paper-cjk.ttf` 替换为 Unifont，覆盖默认中文简历内容与常见中文字段。
- PDF 导出从 jsPDF 迁移到 `pdf-lib` + `@pdf-lib/fontkit`，继续按 `ResumeDraft` JSON 矢量绘制文本、分割线、分页与页脚，不回退到截图/canvas/浏览器打印。
- `resume-pdf.ts` 现在嵌入 sans/mono/CJK 字体并按字符段切换字体，导出沿用当前预览的字段显隐/排序和中英文 `t()` 文案协议。
- 前端依赖移除直接 `jspdf`，新增 `pdf-lib` 与 `@pdf-lib/fontkit` 作为稳定矢量 PDF 生成链路。
- PDF 字体/矢量导出修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。
- CJK 字体覆盖 smoke 通过：`@pdf-lib/fontkit` 检测 `核心身份项目经验工作履历技能矩阵教育经历导出协议示例科技大学`，缺失 glyph 为 `<none>`。
- 用 Playwright + poppler 检查用户提供的新 PDF：确认旧导出嵌入 `Unifont` 且 bullets 换行被 `safeText` 合并，造成字体观感变差和内容像丢失。
- 将 `ktr-paper-cjk.ttf` 从 Unifont 改为拆分后的 `WenQuanYi Zen Hei` TTF，保留完整中文 glyph 覆盖，同时恢复更接近最初 paper 预览的无衬线字体观感。
- 修复 PDF 导出 bullets 原始换行处理：`bullets` 字段不再先压缩空白，导出结果按每行独立绘制，与预览一致。
- 去除预览和 PDF 中对工作战果列表的 4 条硬截断；技能矩阵导出也不再限制为最多 2 行，避免用户输入内容在导出时被静默裁掉。
- 调整 PDF 字号比例、模块标题线位置、字段间距和技能矩阵行距，使矢量导出更贴近右侧 A4 预览，并避免标题压线。
- PDF 导出视觉/内容验证通过：Playwright 从本项目页面实际点击导出，poppler 渲染 `/tmp/ktr-check-prod/render/fixed-1.png`；`pdftotext` 确认三条工作战果、技能、教育等内容完整；`pdffonts` 确认嵌入 `WenQuanYiZenHei` 而非 `Unifont`。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run build`、`npm --prefix web run lint`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 修复 2026-06-03 导出 PDF 中工作履历 bullets 与左侧浅色竖线过近的问题：PDF 绘制时将 bullet 点和文字移动到模块内容缩进内，右侧预览同步增加 bullet 列表内缩与间距。
- 优化 A4 预览与矢量 PDF 的中文字体观感：将 `ktr-paper-cjk.ttf` 从 WenQuanYi Zen Hei 替换为更清晰的 WenQuanYi Micro Hei TrueType 资产，保留完整中文 glyph 覆盖并避免 Noto CJK OTF 子集在 poppler 下的嵌入字体错误。
- 已用 Playwright 在生产服务中实际点击导出并覆盖 `web/你的姓名-frontend-architect-full-stack-engineer-2026-06-03.pdf`；`pdffonts` 确认嵌入 `WenQuanYiMicroHei`，`pdftotext` 确认工作履历三条战果与教育模块完整，`pdftoppm` 渲染确认 bullet 与左侧竖线有明确间距。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 调整中文文案体系：左侧栏 `载荷地图` 改为 `简历结构`，`核心身份` 改为 `我是谁`，`技能矩阵` 改为 `技能点`，`导出协议` 简化为 `导出`。
- 优化编辑表单与预览字段命名：身份模块改为 `身份信息 / 目标岗位 / 手机号 / 城市 / 基本介绍`；项目模块改为 `项目介绍 / 项目名称 / 任务目标 / 工作内容`；工作履历城市、技能点、求学之路等中文同步更新。
- 导出模块改为编辑器专用控制面板，不再参与右侧简历预览、密度计算或 PDF 正文渲染；PDF 页脚仍保留目标岗位摘要。
- 右侧双页预览从横向并排改为纵向堆叠滚动，新增项目导致双页时不会继续横向占用页面宽度。
- 翻译与布局验证通过：Playwright 在生产服务中切换各模块检查新旧中文词、连续新增项目触发双页并确认 `flex-direction: column` / `overflow-y: auto`；导出 PDF 后 `pdftotext` 确认 `基本介绍/技能点/求学之路` 存在且导出模块字段未进入正文。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 修复 PDF 导出字体请求偶发失败：`resume-pdf.ts` 增加字体加载兜底，sans/mono 粗体字体请求失败时复用同角色常规字体，不再因 `/fonts/ktr-paper-sans-bold.ttf` 502 阻断导出。
- 修复工作履历战果列表拆分规则：右侧 A4 预览与 PDF 导出都只按换行符生成 bullet，不再按中英文逗号拆分，避免标点符号被误认为新条目。
- 为所有多行输入框新增全屏编辑模式：长文本字段可打开战术风格全屏弹层编辑，支持 Esc 或按钮退出，原有实时预览逻辑保持不变。
- 真实导出 smoke 通过：Playwright 模拟 `/fonts/ktr-paper-sans-bold.ttf` 返回 502 后仍成功导出 PDF；输入含中英文逗号的两行战果后，预览只生成 2 条 bullet；全屏编辑弹层可打开并用 Esc 关闭。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 扩展 PDF 字体加载兜底：sans/mono 常规字体也允许请求失败，失败时使用 PDF 标准 Helvetica/Courier 字体继续导出，避免 `/fonts/ktr-paper-mono.ttf` 502 造成导出中断。
- 字体请求增加短重试与 cache-bust；自定义字体嵌入失败时也会回退到对应标准字体。
- 真实导出 smoke 通过：Playwright 模拟 `/fonts/ktr-paper-mono.ttf` 返回 502 后仍成功下载 PDF；`pdffonts` 确认 mono 常规回退为 `Courier`，`pdftotext` 确认 `基本介绍/项目经验/工作履历/技能点/求学之路` 正常输出。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 修复 PDF 导出中混排空白/符号可能显示为方框×的问题：导出前统一归一化零宽字符、NBSP、全角空格等异常空白，避免不可见空白落入错误字体。
- 扩展 PDF CJK 字体分段范围：中文标点、全角符号与 CJK 字符统一走 CJK fallback 字体，降低中英文混排中 `.notdef` 方框符号风险。
- 实际导出 smoke 通过：输入普通空格、全角空格、NBSP、中文标点、括号、斜杠、加号、乘号等混排内容后导出 PDF；poppler 渲染 `/tmp/ktr-space-symbol-smoke/render/fixed-1.png` 确认无方框×，`pdftotext` 内容正常。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 新增 Go 后端工程 `backend/`：接入 Gin、GORM、PostgreSQL、CORS、健康检查与环境配置，默认使用 Docker PostgreSQL 密码 `8246baba` 并自动创建 `kill_the_resume` schema。
- 实现用户系统 API：注册、登录、当前用户查询，密码使用 bcrypt 哈希，登录态使用 JWT Bearer 鉴权。
- 实现用户简历云端持久化 API：当前用户简历列表、创建、读取、更新、删除；完整简历草稿以 `jsonb` 保存，列表仅返回元数据。
- 新增前端云端简历面板：在 `/editor` 中接入登录/注册、保存当前简历、刷新列表、载入云端简历、删除云端简历，并保留现有战术终端 UI 风格。
- 修复预览栏在较窄视口可能覆盖中栏顶部按钮的布局问题：右侧 A4 预览改为固定弹性宽度且降低层级，中栏交互层级提升。
- 新增后端文档与环境示例：`backend/README.md`、`backend/.env.example`；根命令新增 `backend:dev`、`backend:test`、`backend:build`，前端新增 `web/.env.example` 用于配置 `NEXT_PUBLIC_API_BASE_URL`。
- 本轮后端验证通过：`cd backend && go test ./...`、`cd backend && go build ./cmd/server`；真实 Docker PostgreSQL 检查确认 `kill_the_resume` schema 下存在 `users,resumes` 表。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:18080/api/v1 npm --prefix web run build`。
- 前后端真实链路 smoke 通过：生产前端 `next start -p 3302` + 后端 `:18080` + Playwright 浏览器操作完成语言切换、注册用户、保存当前简历、从用户简历列表载入云端简历。
- 补充安全与清理验证：`npm --prefix web audit --audit-level=moderate` 结果 `0 vulnerabilities`；真实 smoke 产生的 `smoke-*` / `ui-*` 测试账号与简历已从开发库清理。

- 修复远程访问前端时注册请求打到浏览器本机 `127.0.0.1:8080` 导致 `ERR_CONNECTION_REFUSED` 的问题：`web/src/lib/api.ts` 现在在浏览器端检测当前页面主机，远程访问时自动推导 `http://<当前页面主机>:8080/api/v1`。
- 后端 CORS 默认白名单补充远程开发主机 `38.246.253.179` 的 3000/3001/3301/3302 端口；`web/.env.example` 与 `web/README.md` 增加远程 API 地址说明。
- 本轮修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`cd backend && go test ./...`。

- 修复 `CloudResumeDock` 的 hydration mismatch：云端 API 地址显示改为 `useSyncExternalStore` 的服务端占位/客户端快照模式，避免服务端渲染 `127.0.0.1`、客户端渲染远程 IP 导致 React hydration 恢复错误。
- 增强 PDF CJK 字体加载稳定性：`resume-pdf.ts` 在 `/fonts/ktr-paper-cjk.ttf` 失败后会依次尝试 Next 动态字体路由 `/api/fonts/ktr-paper-cjk.ttf` 与后端字体路由 `http://<当前主机>:8080/assets/fonts/ktr-paper-cjk.ttf`，避免一次静态字体 502 直接中断导出。
- 新增字体备用路由：Next `web/src/app/api/fonts/[name]/route.ts` 提供白名单字体读取；Go 后端新增 `GET/HEAD /assets/fonts/:name`，可从 `web/public/fonts` 或 `FONT_DIR` 提供字体资产。
- 本轮修复验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`cd backend && go test ./...`、后端字体路由 `HEAD/GET /assets/fonts/ktr-paper-cjk.ttf` 返回 `200` 且字节数 `4625912`、`npm --prefix web audit --audit-level=moderate` 结果 `0 vulnerabilities`。

- 修复 PDF 导出分页策略：`resume-pdf.ts` 从模块/条目整块分页改为字段/文本行级流式分页，模块标题跟随首个内容块，当前页剩余空间不足下一行时才换页，避免项目经验下方大面积空白、工作履历被整模块提前推到下一页。
- 清理旧的整块分页估算/绘制函数，PDF block 现在可拆分为标题、字段标题、标签值行、bullet 行、技能矩阵行等连续渲染单元。
- 导出分页验证通过：默认内容导出为 1 页，`pdftotext` 确认 `项目经验 -> 工作履历 -> 技能点 -> 求学之路` 顺序连续；长工作履历 smoke 导出为 2 页，确认工作履历从第一页接着项目经验开始，剩余内容自然续到第二页，技能点仍在工作履历之后。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 将项目经验、工作履历、教育经历的 `period/时间轴` 从自由文本迁移为结构化日期范围 `{ start, end, isPresent }`，默认值与新增条目均使用 `YYYY-MM` 存储格式。
- 新增战术风格日期范围控件：时间轴字段渲染为开始月份、结束月份与“至今/Present”开关；选择“至今”时结束日期自动锁定为空。
- 预览、密度计算与 PDF 导出统一通过 `formatDateRange` 展示结构化时间，中文显示如 `2023.03 — 至今`，英文显示 `2023.03 — Present`；旧字符串 period 会通过 `coerceDateRange` 兼容解析。
- 后端文档同步更新：`resumes.content` 的项目/工作/教育时间字段在 jsonb 中以结构化 period 对象保存，并说明 `start/end/isPresent` 字段含义。
- 日期控件与导出验证通过：Playwright 在生产服务中修改项目时间为 `2023-03 至今`、工作时间为 `2024-05 — 2026-06`；JSON 导出确认 period 为对象，PDF 文本确认输出 `2023.03 — 至今` 与 `2024.05 — 2026.06`。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`cd backend && go test ./...`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 将项目经验、工作履历、教育经历的时间轴彻底改为日期选择控件：编辑器使用开始月份、结束月份与“至今/Present”开关，结束时间在选择至今时自动清空并锁定。
- 新增前端草稿规范化：从云端或旧 JSON 载入旧字符串时间轴时，自动转换为 `{ start, end, isPresent }`，实时预览、密度计算、JSON 导出和 PDF 导出统一使用结构化时间范围。
- 后端保存链路同步升级：`POST/PUT /api/v1/resumes` 写入 `resumes.content` 前会把项目/工作/教育的 legacy 字符串 `period` 规范化为结构化对象；新增后端单元测试覆盖 `至今`、普通起止时间和对象清洗。
- 补齐中英文一致性：英文模式下预览与 PDF 的进行中时间显示为 `Present`，中文模式显示 `至今`。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`cd backend && go test ./...`、`cd backend && go build ./cmd/server`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。

- 修复远程页面加载后长时间转圈、按钮不可点击的问题定位与缓解：根因是 `_next/static/chunks` 曾返回 502，浏览器没有加载到 React 客户端 JS，页面只完成服务端 HTML 展示但未 hydration，因此所有按钮无法响应。
- 优化首屏加载：`ResumeExportActions` 改为点击导出 PDF 时动态加载 `resume-pdf.ts`，避免 `pdf-lib` / `fontkit` 大依赖进入编辑器初始 JS；远程首屏静态资源从 dev 约 21 个降到 production 14 个，初始 HTML 不再包含 `pdf-lib/fontkit`。
- 将前端 3000 切换为已构建的 `next start -H 0.0.0.0 -p 3000` production server，并用 `setsid` 脱离当前命令会话运行，避免 dev HMR/重编译阶段资源 502 影响按钮 hydration。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`；`http://38.246.253.179:3000/editor` 返回 200，首屏 14 个 `_next/static` 资源全部返回 200，audit 结果 `0 vulnerabilities`。

- 重构时间轴日期选择控件 UI/UX：移除浏览器原生 `type=month`，改为符合 Tactical Terminal 风格的自定义年月选择器，包含深色战术面板、霓虹焦点边框、年份步进、月份矩阵、清空动作和状态光点。
- 保持结构化 period 数据协议不变：项目经验、工作履历、教育经历仍写入 `{ start, end, isPresent }`，实时预览、PDF/JSON 导出与后端存储兼容逻辑不变。
- “至今/Present”改为战术状态按钮：激活后自动锁定结束日期、关闭结束年月面板，并保留中英文文案。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`；确认编辑器组件中已无 `type=month`，`http://38.246.253.179:3000/editor` 返回 200 且首屏 14 个静态资源全部 200，audit 结果 `0 vulnerabilities`。

- 加固后端登录/鉴权链路：登录失败统一返回泛化错误，避免账号枚举；登录和注册新增单进程内存限速，按 IP 与 IP+email 双维度计数，超限返回 `429` 与 `Retry-After`。
- 增强 JWT 安全：token 现在写入并校验 `iss`、`aud`、`exp`、`nbf`，解析时固定 HS256 算法；生产环境启动前校验 `JWT_SECRET`，拒绝默认/过短密钥。
- 增强 API 安全边界：新增安全响应头、JSON `Content-Type` 校验、请求体大小限制、统一鉴权失败响应与 `WWW-Authenticate`；安全日志只记录邮箱 hash，不记录明文邮箱、密码或 token。
- 收紧密码处理：注册密码限制为 8-72 bytes，避免 bcrypt 72 bytes 截断风险；继续使用 bcrypt 保存密码哈希。
- 补充后端安全测试与文档：新增 rate limiter、密码/邮箱校验、生产 JWT 配置校验、JWT issuer/audience 拒绝测试；`backend/README.md` 与 `.env.example` 增加安全配置说明。
- 本轮后端验证通过：`cd backend && go test ./...`、`cd backend && go build ./cmd/server`；真实 HTTP smoke 确认安全头存在、缺失/错误 Bearer 返回统一 401、非 JSON 登录返回 415、登录失败触发 429 限速；Docker PostgreSQL 中 smoke 用户已清理。


- 新增实时预览显示/隐藏能力：编辑器进入时默认显示右侧 A4 实时预览，用户可在预览标题栏或顶部状态条隐藏预览，隐藏后右侧只保留战术风格窄 Dock 用于恢复显示。
- 预览显隐状态只保存在前端编辑器 UI 状态中，不写入简历草稿、云端保存或导出协议；隐藏时 `ResumePreview` 不再挂载预览面板，也暂停 ResizeObserver 适配计算，减少不必要渲染。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；已重启 production `next start -H 0.0.0.0 -p 3000`，`http://38.246.253.179:3000/editor` 返回 `200` 且首屏 13 个 `_next/static` 资源全部 `200`。


- 修复云端简历 401 刷屏：`CloudResumeDock` 在自动读取 `/api/v1/resumes` 前会预检 localStorage 中持久化 JWT 的 `exp/iss/aud`，过期或旧协议 token 会直接清理会话并提示重新登录，不再进入重复请求循环。
- 增强授权请求错误处理：云端简历列表刷新、保存、载入、删除如果遇到 `401`，会统一按会话失效处理，清空 token/user/currentResumeId/resumes，避免继续带坏 token 请求受保护接口。
- 确认 `/editor` 502 不是当前构建态问题：已重新构建并重启 production `next start -H 0.0.0.0 -p 3000`，远程 `/editor` 返回 `200`，首屏 13 个 `_next/static` 资源全部 `200`。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`、`cd backend && go test ./...`、`cd backend && go build ./cmd/server`；后端 smoke 确认 `/healthz=200`、未授权 `/api/v1/resumes=401`（预期安全行为）、有效 token `/api/v1/resumes=200`，临时 smoke 用户已清理。


- 统一页面滚动条视觉：新增 `.tactical-scrollbar` 全局样式，使用暗色轨道、细线方形 scrollbar、青绿到橙色霓虹 thumb 与 hover glow，避免浏览器默认滚动条破坏 Tactical Terminal 风格。
- 滚动条已覆盖核心滚动区域：左侧简历结构导航、中间编辑控制台、右侧实时预览双页滚动层，以及长文本 textarea 内部滚动条；单行输入不受影响。
- 本轮前端验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；已重启 production `next start -H 0.0.0.0 -p 3000`，`http://38.246.253.179:3000/editor` 返回 `200`，首屏 13 个 `_next/static` 资源全部 `200`，生产 CSS 确认包含 `tactical-scrollbar` 与 `::-webkit-scrollbar-thumb`。


- 完成 `killer.wrenzeal.top` 生产部署：新增 nginx 站点 `/etc/nginx/sites-available/killer.wrenzeal.top` 并启用，Certbot 成功签发证书，HTTP 已自动 301 到 HTTPS。
- 建立 `/var/www/kill-the-resume` 发布结构：前端 release 发布到 `/var/www/kill-the-resume/release/20260604-113403`，`current` 指向当前 release；PM2 进程 `kill-the-resume-frontend` 运行在 `16639`。
- 将后端也纳入生产进程管理：构建二进制到 `/var/www/kill-the-resume/backend/kill-the-resume-backend`，PM2 进程 `kill-the-resume-backend` 监听 `127.0.0.1:8080`，nginx 同域反代 `/api/`、`/healthz`、`/assets/fonts/`。
- 新增部署脚本与快捷命令：`script/deploy-killer-frontend.sh`、`script/deploy-killer-backend.sh`、`script/start-killer-backend.sh`，以及根目录 `npm run deploy:killer:frontend`、`npm run deploy:killer:backend`、`npm run deploy:killer`。
- 本轮部署验证通过：`https://killer.wrenzeal.top/editor=200`，HTTP -> HTTPS `301`，13 个 `_next/static` 资源全部 `200`，`/healthz=200`，未授权 `/api/v1/resumes=401`，有效 token `/api/v1/resumes=200`；临时 smoke 用户已清理，`nginx -t` 通过，PM2 前后端进程均 online，部署脚本 `bash -n` 通过。


- 新增 killer 证书自动续期脚本：`script/renew-killer-cert.sh`，并安装到 `/usr/local/bin/renew-killer-cert`；脚本锁定 `killer.wrenzeal.top`，使用 `/var/lock/killer-cert-renew.lock` 防并发，日志写入 `/var/log/letsencrypt/killer-renew.log`。
- 接入 systemd 定时任务：新增 `/etc/systemd/system/killer-cert-renew.service` 与 `killer-cert-renew.timer`，每天 03:17 / 15:17 触发并带 30 分钟随机延迟；续期成功后通过 deploy hook 执行 `nginx -t && systemctl reload nginx`。
- 优化 Certbot 执行参数：脚本显式使用 `--no-random-sleep-on-renew`，避免手动 dry-run 被 Certbot 内部 1-8 分钟随机等待拖住；systemd service 设置 `TimeoutStartSec=20min` 防止卡死。
- 本轮验证通过：系统自带 `certbot.timer` 已 active，新增 `killer-cert-renew.timer` 已 enabled/active；`/usr/local/bin/renew-killer-cert dry-run` 模拟续期成功，`nginx -t` 通过，`https://killer.wrenzeal.top/editor=200`，`/healthz=200`，证书有效期到 `2026-09-02`。


- 替换浏览器标签图标：新增符合 kill-the-resume 主题的 Tactical Terminal 图标，暗色底盘、青绿/蓝色准星、被红色斩裂的简历纸张与 `KTR` 标识，保持极客硬核视觉语言。
- 完整接入 favicon / PWA 图标资源：新增 `web/public/favicon.svg`、`favicon.ico`、`apple-touch-icon.png`、`icons/icon.svg`、`icons/icon-192.png`、`icons/icon-512.png` 与 `site.webmanifest`，并在 `web/src/app/layout.tsx` metadata 中显式声明。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-142443`，PM2 `kill-the-resume-frontend` 已重启并在线。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；`https://killer.wrenzeal.top/editor=200`，页面 HTML 已包含 favicon.svg / favicon.ico / apple icon / manifest 链接，远程图标资源均 `200` 且 content-type 正确。


- 浏览器标签标题接入语言偏好：新增中英文 `meta.title` / `meta.description` 文案，默认 SSR 标题为中文，客户端根据当前语言实时更新 `document.title`、`html lang` 与 description meta。
- 修复语言切换后的 meta description 残留问题：`LanguageHydrator` 会清理重复 description 节点，避免浏览器 Head 中同时保留中英文描述。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-144941`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；`https://killer.wrenzeal.top/editor=200`，SSR 标题/描述为中文；真实 Chromium 验证 English/中文切换后 title、`html lang`、description 均同步且 description 仅保留 1 个。


- 更新浏览器标签中文命名：将中文标题从 `战术简历控制台` 调整为 `欢迎来到你的简历杀手控制台`，英文同步为 `Welcome to Your Resume Killer Console`。
- 新增浏览器标签滚动标题效果：`LanguageHydrator` 会根据当前中英文语言生成标题滚动轨道，语言切换后即时重置并滚动显示对应标题；description 与 `html lang` 继续随语言同步。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-151210`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；`https://killer.wrenzeal.top/editor=200`，SSR 标题为 `欢迎来到你的简历杀手控制台`；真实 Chromium 采样确认中文/英文标题都会滚动，`html lang` 与 description 同步正常。


- 更新浏览器标签品牌标题：中文标题改为 `Kill The Resume ! 欢迎来到你的简历杀手控制台`，英文标题改为 `Kill The Resume ! Welcome to Your Resume Killer Console`，品牌前缀固定放在标题起始位置。
- 保持滚动标题逻辑不变：`LanguageHydrator` 继续按当前语言生成滚动标题轨道，语言切换后滚动内容自动切换到对应中英文品牌标题。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-152314`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；`https://killer.wrenzeal.top/editor=200`，SSR 标题为 `Kill The Resume ! 欢迎来到你的简历杀手控制台`；真实 Chromium 采样确认中英文滚动标题均包含 `Kill The Resume !` 品牌轨道。


- 将生产后端端口从 `127.0.0.1:8080` 切换到 `127.0.0.1:19304`：更新 `/var/www/kill-the-resume/shared/backend.env` 的 `SERVER_ADDR`，并同步 nginx `/api/`、`/healthz`、`/assets/fonts/` 反代 upstream。
- 保持后端由 PM2 管理：`kill-the-resume-backend` 继续运行 `/var/www/kill-the-resume/backend/kill-the-resume-backend` Go 二进制；单机当前部署下 PM2 管理该二进制是可接受方案，后续需要 system-level 强守护时再迁移 systemd。
- 更新后端部署脚本默认端口：`script/deploy-killer-backend.sh` 新建生产 env 时默认写入 `SERVER_ADDR=127.0.0.1:19304`。
- 本轮验证通过：`nginx -t`、`bash -n script/deploy-killer-backend.sh`、`bash -n script/start-killer-backend.sh`；`ss` 确认后端监听 `127.0.0.1:19304` 且无 `8080` 监听；本机 `http://127.0.0.1:19304/healthz=200`，公网 `https://killer.wrenzeal.top/healthz=200`，未授权 `https://killer.wrenzeal.top/api/v1/resumes=401` 为预期安全响应。

- 进一步统一仓库默认端口到 `19304`：更新 `backend/internal/config/config.go`、`backend/README.md`、`web/.env.example`、`web/src/lib/api.ts` 和 `web/src/lib/resume-pdf.ts`，避免本地/远程 fallback 继续指向旧 `8080`。
- 重新发布后端与前端：后端二进制通过 `npm run deploy:killer:backend` 重建并由 PM2 重启；前端通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-153253`，生产 `NEXT_PUBLIC_API_BASE_URL=/api/v1` 保持同域反代。
- 补充验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`、`cd backend && go test ./... && go build ./cmd/server`；生产监听仅有 `127.0.0.1:19304` 与前端 `16639`，公网 `/healthz=200`、未授权 `/api/v1/resumes=401`、`/editor=200`。


- 更新首页入口文案：中文首页描述从 `进入战术编辑器，把简历数据作为实时 A4 控制面来操作。` 改为 `欢迎来到你的简历杀手控制台。`，CTA 从 `进入编辑器` 改为 `进入控制台`；英文同步为 `Welcome to your resume killer console.` / `Enter console`。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260604-155427`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 `https://killer.wrenzeal.top/ = 200`，SSR HTML 包含 `欢迎来到你的简历杀手控制台。` 与 `进入控制台`，真实 Chromium 验证中英文首页描述/CTA 均正确。


- 新增轻量简历主题色系统：`ResumeDraft` 增加 `theme` 配置，包含 `presetId` 与 `accentColor`；旧云端/JSON 简历载入时会通过 `normalizeResumeTheme` 自动补默认主题，后端无需改表即可随 `resumes.content` JSONB 保存。
- 新增主题色控制面板：编辑器中加入 `ResumeThemePanel`，提供固定主题色 `赛博绿 / 追踪蓝 / 警戒橙 / 信号紫 / 杀手红 / 纸面黑`，并支持原生色盘自定义颜色；主题色只影响简历纸张，不改变战术编辑器外壳。
- 实时预览与 PDF 导出同步主题色：A4 预览中的模块标题、标题分隔线、项目/工作左轨、技能标题与 bullet 色块会实时使用 `draft.theme.accentColor`；`resume-pdf.ts` 使用同一主题色绘制 PDF 强调线、模块标题、左轨和 bullet，保持预览/导出一致。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-112804`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 `https://killer.wrenzeal.top/editor=200`，真实 Chromium 验证默认主题 `#0f766e`、点击 `杀手红` 后预览变为 `#be123c`、色盘切到 `#6d28d9` 后预览/JSON 导出同步，PDF 导出成功。


- 简化 PDF 导出页脚：`resume-pdf.ts` 的导出页脚移除 `JSON 驱动简历` / `空间密度` 等辅助信息，只保留左侧 `目标岗位: <targetRole>` 与右侧 `PAGE_XX`；右侧实时预览页脚暂不改动。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-151147`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 `https://killer.wrenzeal.top/editor=200`，真实 Chromium 导出 PDF 后 `pdftotext` 确认包含 `目标岗位:` 与 `PAGE_01`，且不再包含 `JSON 驱动简历`、`空间密度`、`JSON-driven resume` 或 `density`。


- 新增自定义模块能力：左侧导航可新增自定义模块，自定义模块支持显示/隐藏、拖拽排序、删除；固定内置模块保持不可删除，只允许显示/隐藏与排序。
- 自定义模块编辑器已接入 Tactical Terminal 风格：模块标题可改，字段可新增/删除/显示隐藏/上下移动，字段标题可自定义，字段类型支持文本、多行文本与结构化日期范围；多行文本保留实时输入与预览。
- 自定义模块已接入完整数据流：`ResumeDraft.customModules[]` 会随 JSON 导出、云端 JSONB 草稿保存、实时 A4 预览、版面密度计算与 `pdf-lib` 矢量 PDF 导出同步；旧草稿载入时会自动补齐/过滤布局中的自定义模块引用。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-161309`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；真实 Chromium 验证本地新增/隐藏/删除自定义模块、文本字段、日期字段、JSON 导出与 PDF 导出均正常，`pdftotext` 确认 PDF 包含 `证书与奖项`、`证书名称: 前端架构认证`、`颁发时间: 2026.06 — 待定`；线上 `https://killer.wrenzeal.top/editor` smoke 通过，自定义模块标题/字段/内容实时出现在预览中。


- 固定左侧导出入口顺序：`导出` 从可拖拽模块列表中分离，固定在左侧底部、`新增自定义模块` 按钮上方，符合“导出永远是最后一步”的操作心智。
- 修正模块布局数据流：新增自定义模块会插入到 `export` 之前；拖拽模块与旧草稿载入规范化都会调用 `ensureExportLast`，保证 `draft.layout.modules` 中 `export` 始终位于末尾。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-163018`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；真实 Chromium 本地 smoke 确认新增自定义模块显示在导出上方、导出不再出现在可拖拽列表、JSON 导出中 `layout.modules` 最后一项为 `export`；线上 `https://killer.wrenzeal.top/editor` smoke 通过。


- 优化云端简历面板文案：将“接入后端用户系统…API: /api/v1”这类开发者备忘录式说明，改成面向用户的“登录后即可把当前简历保存到云端，在不同设备或历史版本之间快速切换与恢复。”
- 移除云端面板中的 API 地址展示：`CloudResumeDock` 不再渲染 `getApiBaseUrl()` / `api_host_pending`，避免产品界面出现 `/api/v1` 这类开发调试信息；英文文案同步调整为用户向说明。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-202154`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 `https://killer.wrenzeal.top/editor` Chromium smoke 确认新文案可见，且面板中不再包含 `/api/v1`、`API:` 或 `api_host_pending`。


- 优化编辑器主说明文案：将 `左侧编辑结构化简历内容，右侧即时渲染真实 A4。拒绝死纸，拒绝温吞 SaaS。` 改为更用户向的 `在这里管理简历内容、模块顺序与显示状态，右侧会同步呈现最终 A4 版式效果。`
- 英文说明同步调整为：`Manage your resume content, module order, and visibility here while the final A4 layout updates live on the right.`
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-203107`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：i18n 中英文 key 对齐检查、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 `https://killer.wrenzeal.top/editor` Chromium smoke 确认新文案可见，旧文案 `左侧编辑结构化简历内容` / `拒绝死纸` / `温吞 SaaS` 不再出现。


- 轻量提升编辑器界面字号：放大左侧导航、状态条、说明文字、按钮、表单标签/输入框、日期控件、云端/主题/导出面板等 UI 外壳字号，提高可读性。
- 保持右侧 A4 简历纸张与 PDF 导出字号不变，避免影响简历排版密度与导出一致性。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260605-204048`，PM2 `kill-the-resume-frontend` 已重启并 online。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium smoke 确认导航/说明/输入字号分别约 `13px` / `15px` / `16px` 且自定义模块实时预览仍可用；线上 `https://killer.wrenzeal.top/editor` Chromium smoke 确认生产字号为 `13px` / `15px` / `16px`。

- 全屏长文本编辑加入轻量 Markdown 编辑器：`TacticalTextField` 的全屏模式新增标题、加粗、斜体、列表、引用、代码工具栏，并支持源码 / 分栏 / 预览三种模式，保持当前 Tactical Terminal UI 风格且不新增前端运行时依赖。
- 实时 A4 预览与 PDF 导出接入 Markdown 可读化：新增 `web/src/lib/markdown.ts`，常见 Markdown 语法会在右侧预览和 `pdf-lib` 矢量 PDF 中转为可读简历内容，避免 `##`、`**`、反引号等源码噪音直接出现在最终结果；JSON/云端草稿仍保留用户原始 Markdown 文本。
- 版面密度计算同步使用 Markdown 清洗后的文本，避免语法符号额外影响 A4 压缩/双页判断；工作履历等列表字段继续按换行分条，不按标点拆分。
- 修复前端部署脚本的端口孤儿进程问题：`script/deploy-killer-frontend.sh` 在删除 PM2 旧进程后会释放 `16639` 上遗留的 stale listener，避免旧 `next-server` 占用端口导致新 PM2 进程反复 `EADDRINUSE`。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260606-110316`，PM2 `kill-the-resume-frontend` 已重启并保持 online。
- 本轮验证通过：i18n 中英文 key 对齐检查（263/263）、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`、`bash -n script/deploy-killer-frontend.sh`，audit 结果 `0 vulnerabilities`；本地 Chromium smoke 验证全屏 Markdown 工具栏、预览、A4 渲染与 PDF 下载均正常，`pdftotext` 确认 PDF 包含清洗后的 Markdown 内容且不包含 `##` / `**第二条成果**` / 反引号；线上 `https://killer.wrenzeal.top/editor=200`，生产 Chromium smoke、PDF 文本断言、PM2 online 状态与当前 release `/var/www/kill-the-resume/release/20260606-110316` 均通过。


- 修复云端简历保存语义：加载历史简历后，主按钮固定为 `保存当前简历` 并调用 `PUT /api/v1/resumes/:id` 更新当前云端简历，不再误导用户只能创建新简历。
- 新增显式 `另存为新简历` 操作：只有点击该按钮才调用 `POST /api/v1/resumes` 创建新简历，避免“保存”和“复制为新版本”混在一起。
- 调整云端会话持久化：`cloud-store` 现在只持久化 token/user，不再跨浏览器会话保存 `currentResumeId`，避免下次打开编辑器时默认本地草稿误覆盖上一次激活的云端简历。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-092859`，PM2 `kill-the-resume-frontend` 已重启并保持 online。
- 本轮验证通过：i18n 中英文 key 对齐检查（266/266）、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地与线上 Chromium mock API smoke 均确认加载简历后 `保存当前简历` 只触发 `PUT /resumes/:id`，不会触发 `POST /resumes`，点击 `另存为新简历` 才触发 `POST /resumes`，且 localStorage 不再包含 `currentResumeId`；线上 `https://killer.wrenzeal.top/editor=200`，当前 release `/var/www/kill-the-resume/release/20260608-092859`，PM2 online。


- 修复 F12/开发者工具导致右侧预览页数变化的问题：`ResumePreview` 现在使用隐藏的固定 500px A4 测量稿判断一页/两页，不再用当前屏幕里可见纸张的实际宽高做页数决策，避免 DevTools 打开/关闭改变视口后让同一份简历在一页和两页之间跳变。
- 可见预览仍会根据右侧面板大小自适应缩放，但页数判断与视口宽度解耦；状态栏 `FIT` 显示的是固定 A4 逻辑容量下的压缩比例。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-094443`，PM2 `kill-the-resume-frontend` 已重启并保持 online。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地与线上 Chromium 视口回归均确认同一份长简历在宽视口 `1500x950` 和模拟 F12 窄视口 `1050x950` 下都稳定显示双页，状态均为 `双页 · 空间压缩已武装 · FIT 46%`；线上 `https://killer.wrenzeal.top/editor=200`，当前 release `/var/www/kill-the-resume/release/20260608-094443`，PM2 online。

- 移除工作履历「战果列表」的默认自动分点：右侧 A4 预览不再把每一行普通文本强制渲染成 bullet，只有用户在 Markdown 中显式使用 `- ` / `1.` 等列表语法时才显示分点。
- PDF 导出同步改为按 Markdown 语义绘制工作履历战果内容：普通段落保持段落，显式 Markdown 列表才绘制项目符号，避免预览与导出行为不一致。
- 更新中英文占位提示，明确「战果列表」支持 Markdown，需要分点时由用户自己使用列表语法。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-100942`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复刷新浏览器后已加载云端简历丢失的问题：当前标签页会用 `sessionStorage` 记录活动云端简历 ID 与当前草稿快照，刷新 `/editor` 后自动恢复到上次载入的简历。
- 保持跨会话安全边界：长期 localStorage 仍只保存 token/user，不持久化 `currentResumeId`；关闭标签页后活动简历上下文不会长期残留，避免后续新会话误覆盖云端简历。
- 云端简历被删除、退出登录、会话失效或活动 ID 不存在时会清理当前标签页恢复快照；中英文同步新增刷新恢复状态提示。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；源码断言确认 `sessionStorage` 读写/清理、刷新恢复 `replaceDraft`、活动 ID 恢复和中英文状态文案均存在。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-102146`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复 Markdown 有序列表渲染：`1.` / `2.` 现在会保留序号显示，不再和 `-` 无序列表一样渲染成圆点。
- 全屏 Markdown 预览、右侧 A4 实时预览、工作履历 PDF 矢量导出同步支持有序/无序列表差异；Markdown parser 现在保留列表的 `ordered/order` 元数据。
- Markdown 纯文本转换也会保留有序列表编号，避免密度计算、标题提取或导出辅助路径把序号语义丢掉。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；源码断言确认 parser、全屏预览、A4 预览、PDF 绘制链路均包含有序列表编号逻辑。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-103231`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复云端简历列表中“当前”激活标记竖向换行的问题：激活 badge 现在使用 `inline-flex shrink-0 whitespace-nowrap`，中文“当前”和英文 `active` 都保持单行显示。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；源码断言确认 `cloud.active` 标记包含单行显示样式。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-104635`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 将“技能点”模块统一更名为“专业技能”，中英文导航、编辑面板、实时 A4 预览和 PDF 导出标题同步更新为 `专业技能` / `Professional Skills`。
- 专业技能新增展示协议：用户可选择 Markdown 或标签模式，并可选择单栏/双栏布局；Markdown 模式保留用户自定义 Markdown 内容，不再被旧的 monospace/uppercase 样式覆盖。
- 标签模式下取消全屏 Markdown 编辑入口，改为输入技能后按 Enter 生成标签；标签内容以换行形式存入同一份简历 JSON，右侧预览与 vector PDF 导出同步渲染标签 chip。
- 新增技能模块旧草稿兼容规范化：缺失 `displayMode` / `columnMode` 的历史云端或本地草稿会自动补为 Markdown + 双栏，不影响原有技能文本。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；源码断言确认编辑器、A4 预览、PDF 导出、i18n 和旧草稿 normalize 链路均接入专业技能展示协议。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-112312`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复右侧实时 A4 预览页脚与 PDF 导出页脚不一致的问题：预览页脚现在与实际 PDF 一样，左侧只显示 `目标岗位/Target Role: <targetRole>`，右侧显示 `PAGE_XX`。
- 移除预览页脚里的生成器/空间密度文本，并去掉对目标岗位的强制 uppercase，避免预览和 vector PDF 在页脚内容上产生差异。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-141446`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 专业技能支持四个内置分类自定义改名：`语言`、`前端系统`、`后端/数据`、`工具链` 都可以在编辑器内直接修改分类名称，左侧字段结构、右侧 A4 预览和 PDF 导出使用同一份自定义名称。
- 专业技能新增自定义技能分类：用户可以新增、隐藏/显示、删除自定义技能分类；自定义分类在 Markdown 模式保留用户 Markdown 内容，在标签模式按 Enter 生成标签并同步预览/PDF。
- 扩展 `draft.skills` JSON 协议为 `labels + customCategories + displayMode + columnMode`，旧草稿会自动补齐默认内置分类名和空自定义分类，不需要后端改表，云端 JSONB 可直接保存。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地与线上 Chromium 交互烟测均确认内置分类改名、自定义分类新增和右侧预览同步，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-145255`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复专业技能分类名称无法清空的问题：分类名称输入框现在使用编辑态原始值，用户按退格清空 `语言` 等内置分类名时不会被立即自动回填。
- 将技能分类名称默认值回填移动到持久化链路：云端保存和 JSON 导出前才会通过保存态 normalize 对空分类名回填默认值，预览/PDF/编辑仍保持当前用户正在编辑的内容。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；normalize 断言确认编辑态保留空字符串、保存态回填默认值；本地与线上 Chromium 烟测确认清空分类名不会自动回填，重新输入后右侧预览同步，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-153418`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 调整中文教育经历文案：编辑面板标题与右侧 A4 预览标题从“求学之路”统一改为“教育经历”，左侧导航保持“教育经历”。
- 调整专业技能展示方式按钮文案：中文 `Markdown` 按钮改为“文档”，英文仍保持 `Markdown`。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；线上 Chromium 文案 smoke 确认“文档/标签”按钮、编辑面板“教育经历”和预览“教育经历”均出现，且页面不再包含“求学之路”，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-154428`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 将身份模块中文用户文案统一从“我是谁”调整为“基本信息”，同步左侧导航、编辑面板、右侧 A4 预览摘要标题和 PDF 导出模块标题；英文对应为 `Basic Info`。
- 基本信息模块新增个人照片上传能力：支持 PNG/JPG/WebP，前端读取并压缩为简历 JSON 内的 `draft.identity.photo`，历史草稿加载时会自动补齐照片字段与字段布局；右侧预览和 vector PDF 导出都会渲染该照片。
- 强化简历输出标题层级：右侧 A4 预览与 PDF 导出中的模块标题、条目标题、字段小标题和专业技能分类名字号/字重提升，让标题层级明显高于正文。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium smoke 确认“基本信息”文案、照片上传预览、标题字号层级和 PDF 下载均正常，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-161121`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`，线上 Chromium smoke 确认照片预览与 PDF 导出正常，console error 为 0。

- 修复基本信息站点字段的输出边界：右侧 A4 预览会将 `https://` / `www.` 前缀隐藏为更短的展示文本，站点在受控联系信息宽度内最多显示两行，并通过 `overflow-wrap:anywhere` + `word-break:break-all` 防止长 URL 撑乱版式。
- 修复 PDF 导出中站点字段越界：导出时同样使用短站点展示文本，右侧联系信息按可用宽度绘制，email/location 单行安全裁切，website 最多两行并自动省略，避免超出 A4 右边界。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium 使用超长站点分别验证无照片/有照片预览布局和 PDF 下载，均未出现 A4/容器越界，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-204517`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`，线上 Chromium 超长站点 + 照片 + PDF 导出 smoke 通过，console error 为 0。

- 将工作履历字段“战果列表”统一改为“工作内容”：编辑面板、字段布局控制、右侧 A4 预览和 vector PDF 导出都通过同一 `work.bullets` label 显示新文案。
- 英文工作履历对应字段同步显示为 `Work Content`，保留底层 JSON 字段 `work.bullets` 不变，避免破坏历史草稿和云端数据兼容。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium smoke 确认页面出现“工作内容”且不再出现“战果列表”，PDF 下载正常，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-220525`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`，线上 Chromium 文案 + PDF smoke 通过，console error 为 0。

- 云端简历面板新增“新建默认简历”操作：即使当前已经载入云端简历，也可以一键恢复默认基础草稿，而不需要先另存为或覆盖当前简历。
- 新建默认简历会清除当前 `currentResumeId` 和标签页恢复会话，解除与已加载云端简历的绑定；随后点击“创建云端简历”会走 `POST /api/v1/resumes` 新建记录，不会 `PUT` 覆盖原简历。
- 新增中英文状态文案：新建默认基础简历后提示“保存时会创建新的云端简历”，让用户明确当前草稿已脱离原云端版本。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium mock API smoke 覆盖“登录 -> 载入云端简历 -> 新建默认简历 -> 创建云端简历”，确认只触发 `POST /resumes` 且无 `PUT` 覆盖，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260608-221740`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`，线上同场景 mock API smoke 通过，console error 为 0。

- 优化基本信息照片展示：右侧 A4 预览与 PDF 导出中的个人照片不再绘制外框、描边、内边距或阴影，直接显示照片内容。
- 修复有照片时基本信息联系方式被压缩的问题：邮箱、城市、站点从照片左侧窄列移到标题区下方独立右对齐联系区，允许按整张 A4 宽度自然换行，避免被截断或挤压。
- 同步 PDF 头部布局：照片直接贴图到右上角，联系方式使用扩展后的整行可用宽度绘制，并增加首屏头部高度，避免联系方式和正文模块重叠。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地 Chromium 使用“照片 + 长邮箱 + 长城市 + 长站点”验证照片无外框、联系方式不越界且 PDF 下载正常，console error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260610-100728`，PM2 `kill-the-resume-frontend` 已重启并保持 online；线上 `https://killer.wrenzeal.top/editor` 返回 `200`，线上同场景 smoke 通过，console error 为 0。

- 修复基础信息照片条件布局：无照片时恢复原本紧凑头部，邮箱/城市/站点继续位于右上联系区，移除照片后不再残留额外上方空白。
- 有照片时仅优化照片场景：右侧 A4 预览把邮箱/城市/站点放在照片左侧，照片保持无外框/无阴影直接显示；PDF 导出同步恢复紧凑头部高度并采用同样的照片左侧联系信息布局。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地与线上 Chromium smoke 均覆盖无照片、有照片、移除照片后恢复紧凑布局和两种 PDF 下载，console/page error 为 0。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260610-104744`，PM2 `kill-the-resume-frontend` online 且 0 次重启；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 修复基本信息站点地址点击跳转错误：预览中仍显示短站点文本（如 `example.dev`），但真实链接会规范化为外部 `https://example.dev/`，避免被浏览器当作本站相对路径导致文件找不到。
- PDF 导出同步为站点文本写入显式 URI link annotation，点击 PDF 中的站点地址会跳转到规范化外部 URL，而不是依赖 PDF 查看器对裸域名的错误自动识别。
- 本轮验证通过：`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`，audit 结果 `0 vulnerabilities`；本地与线上 Chromium smoke 确认预览链接 `href=https://example.dev/`、点击发起外部请求且无本站相对路径请求，PDF 内含 `https://example.dev/` URI 注解。
- 已发布到生产站点：通过 `npm run deploy:killer:frontend` 发布到 `/var/www/kill-the-resume/release/20260610-111411`，PM2 `kill-the-resume-frontend` online 且 0 次重启；线上 `https://killer.wrenzeal.top/editor` 返回 `200`。

- 更新项目状态记忆：确认本地 `main`、tracking `origin/main` 与远端 GitHub `refs/heads/main` 均已指向 `9aae833345f7a19b5fd8786e0c95edaff3f9d201`，清除已过期的 GitHub push blocker 待办。
- 本轮验证通过：`git rev-parse HEAD`、`git rev-parse origin/main`、`GIT_TERMINAL_PROMPT=0 git ls-remote origin refs/heads/main`、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 完成工程化优化升级：新增前端 Node 原生回归测试入口 `npm run web:test`，覆盖 website 外链规范化、Markdown 有序/无序列表、结构化日期、专业技能标签/空 label 持久化、简历 normalize，以及 preview/PDF 共享 projection。
- 新增 `web/src/lib/resume-projection.ts`，将字段可见性、字段 caption、模块 item、身份联系方式、meta 字段和技能 section 规则统一给 `ResumePreview` 与 `resume-pdf` 使用，降低预览/PDF 漂移风险。
- 修复新测试发现的 Markdown 纯文本回归：`markdownToPlainText` 现在保留有序列表编号，避免密度/PDF 辅助路径丢失 `1.` / `2.` 语义。
- 拆分编辑器大文件：从 `ResumeModuleConsoles.tsx` 抽出 `DateRangeField.tsx` 与 `IdentityPhotoField.tsx`，保持现有视觉与交互不变，同时降低主编辑面板文件体量。
- 清理与升级依赖：移除未使用的 `naive-ui`，将 `@types/node`、`@types/react`、`@types/react-dom` 从 `latest` 固定到明确版本，并将 Next.js / `eslint-config-next` 升级到 `16.2.9`；暂缓 eslint major 升级。
- 新增 GitHub Actions CI：`.github/workflows/ci.yml` 覆盖前端 `npm ci`、test、typecheck、lint、build、audit，以及后端 test/build。
- 后端持久化硬化：新增 `backend/internal/db/migrations.go` 版本化迁移 runner，AutoMigrate 后记录并执行 `schema_migrations`；resume content normalize 现在要求 JSON object，规范化 period，并写入 `schema: "kill-the-resume.resume.v1"` 与 `version: 1`。
- 本轮验证通过：`npm run web:test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`npm run backend:test`、`npm run backend:build`、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 优化根目录 README：`README.md` 现在是中文主文档，顶部展示当前浏览器标签图标 `web/public/favicon.svg`，并说明暗色战术终端底板、定位框、撕裂简历、红色 kill slash 与 `KTR` 标记的品牌含义。
- 新增英文文档 `README.en.md`，与中文 README 保持同结构内容，覆盖项目定位、技术栈、仓库结构、快速启动、验证命令、CI、部署概览和维护原则。
- 本轮验证通过：README code fence 与关键链接目标检查、`npm run web:test`、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 完成前端迁移到 Vercel 的代码准备：新增 `web/vercel.json`，前端 HTTPS/SSR 默认使用同源 `/api/v1`，并通过 `KTR_BACKEND_ORIGIN` 在 `web/next.config.ts` 中把 `/api/v1/*`、`/healthz`、`/assets/fonts/*` rewrite 到外部 Go 后端；本地与远程 HTTP 开发仍保留端口 `19304` 自动推导。
- 后端 CORS 默认追加 `https://*.vercel.app` 并启用 Gin wildcard 支持，部署脚本与 `.env.example` 同步更新；新增后端 CORS 预检测试和前端 API base URL 回归测试。
- 更新 Vercel 部署文档：Vercel 导入 GitHub 时 Root Directory 使用 `web`，环境变量设置 `NEXT_PUBLIC_API_BASE_URL=/api/v1` 与 `KTR_BACKEND_ORIGIN=https://<后端公开域名>`；旧自托管前端脚本保留为回滚路径。
- 本轮验证通过：`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`npm run backend:test`、`npm run backend:build`。

- 服务器已启用 `api.killer.wrenzeal.top` 后端入口：新增 `/etc/nginx/sites-available/api.killer.wrenzeal.top`，签发 Let's Encrypt 证书，HTTPS 反代到本机 `127.0.0.1:19304`，HTTP 自动 301 到 HTTPS。
- 更新生产后端环境 `/var/www/kill-the-resume/shared/backend.env` 的 `CORS_ORIGINS`，追加 `https://*.vercel.app` 与 `https://api.killer.wrenzeal.top`，并通过 `npm run deploy:killer:backend` 重新构建/重启 PM2 后端以启用 wildcard CORS。
- 本轮验证通过：`nginx -t`、PM2 `kill-the-resume-backend` online、`https://api.killer.wrenzeal.top/healthz` 返回 200、Vercel preview/branch-like origin 的 `/api/v1/auth/login` CORS preflight 返回 204。

- 复用并改造现有 `killer-cert-renew.timer` 自动续期机制：`script/renew-killer-cert.sh` 现在支持 `DOMAINS=` / `DOMAIN=` 配置多个证书 lineage，但默认只续期后端 API 证书 `api.killer.wrenzeal.top`，避免已迁往 Vercel 的根域名 `killer.wrenzeal.top` 解析到非本机时拖失败。
- 已同步安装 `/usr/local/bin/renew-killer-cert`，更新 `/etc/systemd/system/killer-cert-renew.service` 与 `.timer` 描述并保持每日 03/15 点两次运行、随机延迟、持久化触发；续期 hook 仍先执行 `nginx -t` 再 reload nginx。
- 本轮验证通过：`bash -n script/renew-killer-cert.sh`、`/usr/local/bin/renew-killer-cert dry-run`（`api.killer.wrenzeal.top` simulated renewal success）、`systemctl status killer-cert-renew.timer` active、`nginx -t`、`https://api.killer.wrenzeal.top/healthz` 返回 200。记录：`killer.wrenzeal.top` dry-run 因当前解析到 Vercel IP `216.198.79.65` 返回 ACME 404，故不应纳入本机专用续期 timer。

- 修复 Vercel 前端 API 请求仍显示 `killer.wrenzeal.top` 的问题：线上 bundle 中 `NEXT_PUBLIC_API_BASE_URL` 被构建成 `/api/v1`，浏览器因此请求同源 `https://killer.wrenzeal.top/api/v1/*`；当前 Vercel 同源 rewrite 未生效，返回 404。
- 前端 API 解析已改为 HTTPS 生产环境直接使用 `https://api.killer.wrenzeal.top/api/v1`，并在检测到相对路径 `/api/v1` 时视为旧配置自动兜底到 API 子域；文档和 `web/.env.example` 同步改为推荐 `NEXT_PUBLIC_API_BASE_URL=https://api.killer.wrenzeal.top/api/v1`。
- 本轮验证通过：抓取线上 JS 确认旧 bundle 内嵌 `/api/v1`，本地 `npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）；构建产物确认包含 `https://api.killer.wrenzeal.top/api/v1`。

- 新增机会雷达 / 牛马雷达 MVP：`/job-radar` 采用战术终端三栏布局，支持手动输入岗位关键字、地点、企业性质、技术关键词、排除关键词和最低匹配度，并展示按匹配度/新鲜度排序的岗位列表。
- 新增 `web/src/lib/job-radar.ts` 前端纯数据层：提供 mock 网络岗位数据、岗位效期策略、过期过滤、匹配百分比、命中标签、风险标签和原站 `sourceUrl` 保留，为后续真实招聘数据源与后端缓存表预留字段语义。
- 首页新增 `启动机会雷达` / `Launch Job Radar` 入口；岗位标题、卡片动作和详情面板均可用新窗口打开原始招聘来源链接。
- 本轮验证通过：`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）；生产构建路由包含静态 `/job-radar`。

- 修复机会雷达页面语言切换不完整的问题：`/job-radar` 顶部标题、说明、右上角导航按钮、搜索面板、列表空态、详情面板、日期字段和操作按钮均接入现有中英文 i18n，英文模式不再残留中文按钮文案。
- 优化岗位匹配标签展示：匹配标签改为结构化 `kind + label`，岗位卡片和详情只显示具体内容，不再显示 `关键词:` / `技能:` 等前缀；新增颜色图例说明不同颜色分别代表岗位关键字、技能、地点、企业性质、风险和缺口。
- 本轮验证通过：`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）；生产构建仍包含静态 `/job-radar`。

- 修复机会雷达英文模式仍残留中文的问题：`/job-radar` 现在按语言重建默认搜索条件和 mock 岗位展示数据，英文模式下岗位标题、公司、企业性质、地点、任务、要求、描述、placeholder、指标和排序提示均使用英文展示。
- 数据层新增 `JobRadarLanguage` 支持，`createDefaultJobRadarCriteria` 与 `createMockJobPostings` 可按 `zh-CN` / `en-US` 返回本地化数据；英文 mock 展示字段新增回归测试，防止英文页面再出现中文展示内容。
- 本轮验证通过：`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）；生产构建仍包含静态 `/job-radar`。

- 机会雷达接入真实岗位数据链路：后端新增 `job_postings` 缓存模型与 `/api/v1/job-radar/jobs` 公开查询接口，按手动条件从缓存返回真实岗位匹配结果，并保留 `sourceName`、`sourceJobId`、`sourceUrl`、`postedAt`、`firstSeenAt`、`lastSeenAt`、`expiresAt`、`freshnessStatus` 等生命周期字段。
- 新增 `backend/internal/jobradar` 数据层：使用 Remotive 公开 API 作为首个合规岗位源，默认 6 小时按需同步一次；岗位按 7/30/45/60 天策略标记热点/一般/临期/过期并清理超期缓存，后端同步返回匹配百分比、关键词/技能/地点/企业性质标签、风险/缺口标签和原站链接。
- `/job-radar` 前端从本地 mock 切到后端岗位缓存查询：保留本地 mock 仅作为后端不可达时的降级预览；页面新增真实数据源/同步状态提示，继续展示匹配度、颜色标签图例、风险标签、岗位详情和原站跳转。
- 文档与配置同步更新：`backend/.env.example`、`backend/README.md` 记录机会雷达同步环境变量、Remotive 来源约束和接口示例，`todo_list.md` 已移除完成的真实数据源待办。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 修正机会雷达真实岗位抓取逻辑：后端新增 `job_search_caches` 与 `job_search_results`，按岗位关键字、技术关键词、地点、企业性质生成 `searchFingerprint` 并保存搜索条件；从“全局 6 小时缓存”改为“每个搜索范围 6 小时按需同步”，切换前端/后端等关键词会触发独立岗位源抓取，不再复用上一批全局岗位。
- `/api/v1/job-radar/jobs` 新增 `refresh=1` / `forceRefresh=true` 强制刷新当前搜索范围，响应 meta 返回 `searchFingerprint`、`searchQuery`、`cacheHit`、`lastSyncedAt`；`excludeKeywords` 与 `minScore` 保持只影响本地过滤/排序，不制造新的抓取范围。
- 前端机会雷达新增当前搜索范围、缓存命中/同步状态、最近同步时间和“刷新岗位源”按钮；中文 `后端`、`前端`、`远程`、`深圳` 等搜索词在后端扩展为英文源查询/匹配词，适配当前 Remotive 英文岗位源。
- 文档与配置同步更新：`backend/README.md`、`backend/.env.example`、`PROJECT_MEMORY.md` 说明机会雷达按搜索指纹缓存和同步，不再描述为全局岗位缓存。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 删除机会雷达前端岗位 mock 数据：移除 `createMockJobPostings`、固定 mock 时间戳、本地 mock 降级列表和 `dataSourceFallback` 文案，后端不可达时只展示真实数据错误/空态，不再展示假岗位。
- 保留前端纯匹配/效期 helper 供测试与真实响应展示使用；回归测试改为内联岗位样例和默认条件校验，不再依赖产品 mock 数据。
- 本轮验证通过：`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm run backend:test`、`npm run backend:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`。

- 机会雷达搜索条件改为账号级持久化：后端新增 `job_radar_preferences` 表、GORM model、迁移以及鉴权接口 `GET/PUT /api/v1/job-radar/preferences`，每个登录用户保存一份最近查询条件和对应搜索指纹。
- `/job-radar` 前端接入云端登录态：登录后先恢复账号上次搜索条件再查询岗位，查询输入会自动保存到账号；未登录仍可公开查询真实岗位，但会提示登录后保存。
- 文档与项目记忆同步更新，明确雷达偏好接口、持久化表和“不再使用 mock 岗位”的实现边界。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 修复机会雷达刷新仍像读取旧缓存的问题：`refresh=1` / `forceRefresh=true` 现在会严格访问 Remotive 线上岗位源，源站请求带 no-cache header 和刷新参数，并用本次源站返回结果替换当前搜索范围的旧结果关联；源站失败时返回 502，不再静默回退数据库旧列表。
- 前端刷新请求改为浏览器 `no-store`，并在雷达状态区展示本次线上抓取数量与当前搜索范围写入数量；状态文案同步澄清缓存命中与线上源刷新语义。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`；生产后端已通过 `npm run deploy:killer:backend` 重建并重启，`https://api.killer.wrenzeal.top/healthz` 返回 200，线上 `refresh=1` 实测返回 `forceRefresh=true`、`fetchedCount=30`、`linkedCount=30`。

- 机会雷达新增真实岗位导入链路：后端新增鉴权接口 `POST /api/v1/job-radar/import`，可接收来源、原站链接、岗位标题、公司、地点、薪资、岗位正文和当前搜索条件，自动生成稳定 `sourceJobId`，写入 `job_postings` 并关联到当前 `searchFingerprint`。
- `/job-radar` 前端新增“导入岗位”弹窗，登录用户可手动粘贴真实岗位并立即按当前条件计算匹配度；前端 API 回归测试覆盖导入接口的 Bearer token 与请求体。
- 新增独立 `job-radar-extension/` Chrome/Edge Manifest V3 插件项目：读取当前页 URL、标题和选中文本，允许补充岗位字段/API/token/匹配条件，并调用后端导入接口；项目包含完整中文 `README.md`、权限说明和本地校验命令。
- 文档与记忆同步更新：`backend/README.md` 记录导入接口示例和缓存语义，`PROJECT_MEMORY.md` 记录机会雷达导入/插件架构；`todo_list.md` 已清空已完成开发方案。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`、`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。


- 机会雷达插件鉴权改为专用 Token：后端新增 `job_radar_plugin_tokens` 表、AutoMigrate/migration、`GET/POST/DELETE /api/v1/job-radar/plugin-tokens` 管理接口；Token 明文只在创建时返回一次，数据库只保存 SHA-256 hash，支持过期、撤销和最近使用时间。
- `POST /api/v1/job-radar/import` 现在同时支持主站登录 JWT 与 `ktrp_` 插件专用 Token；专用 Token 只被导入接口接受，不能访问 `/me`、`/resumes`、偏好等账号接口。
- `/job-radar` 机会雷达页面新增“插件 Token 管理”区，可生成并复制、刷新列表、撤销 Token；浏览器插件弹窗和 README 改为要求 `ktrp_` Plugin Token，不再让用户寻找/复制登录 JWT。
- 本轮验证通过：`npm run backend:test`、`npm run backend:build`、`npm run web:test`、`npm run web:typecheck`、`npm run web:lint`、`npm run web:build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`git diff --check`。

- 修正机会雷达插件 Token 入口归属：从 `/editor` 账户与云端简历面板移除插件 Token 管理，改为在 `/job-radar` 机会雷达页面顶部生成、复制、刷新和撤销 `ktrp_` 插件专用 Token；简历页重新只负责账号/云端简历同步。
- 同步更新插件 README、后端 README 与项目记忆，明确浏览器插件 Token 应从机会雷达页面获取，而不是简历编辑页面。
- 本轮验证通过：`npm run web:lint`、`npm run web:typecheck`、`npm run web:test`、`npm run web:build`、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 升级机会雷达浏览器插件为当前页自动解析流程：插件版本提升到 `0.2.0`，用户点击插件后自动读取当前岗位详情页 URL、标题、canonical、页面文字和选中文本，并自动填充岗位名、公司、地点、薪资和正文。
- 新增 Boss 直聘优先适配器、猎聘适配器和通用网页兜底解析；弹窗新增 `Re-read Page`，手动输入变为字段修正兜底，不再要求先选中文本再手动补全大部分内容。
- 插件 README 与项目记忆同步更新，明确插件不批量抓取、不自动翻页、不后台静默采集，只在用户主动点击时解析当前页。
- 本轮验证通过：`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 修复机会雷达插件导入后当前列表显示“没有匹配岗位”的问题：插件不再把自动解析到的岗位地点/公司类型当成本次搜索范围；当插件没有显式填写岗位关键字、地点、企业性质或技能时，后端导入接口会回退使用该账号在 `/job-radar` 保存的最新搜索条件，从而把导入岗位关联到当前雷达搜索指纹。
- 修复插件页面注入脚本缺失 `MAX_TEXT_LENGTH` 常量的问题，避免自动解析当前页时因运行时变量不可见而失败。
- 同步更新插件 README、后端 README 与项目记忆，说明插件匹配条件默认可留空、留空时使用雷达页当前搜索条件。
- 本轮验证通过：`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`npm run backend:test`、`npm run backend:build`、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`；生产后端已通过 `npm run deploy:killer:backend` 重建并重启，PM2 `kill-the-resume-backend` online，`https://api.killer.wrenzeal.top/healthz` 返回 `{"status":"ok"}`。

- 清理根目录 README 的项目图标展示：删除中文 `README.md` 与英文 `README.en.md` 顶部 favicon 图片块，以及 `项目图标` / `Project Icon` 说明段落，保留更直接的项目介绍。
- 同步更新项目记忆，记录 README 不再展示项目图标说明。
- 本轮验证通过：`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 修复机会雷达浏览器插件薪资解析与 Send 403 问题：插件版本提升到 `0.2.1`，薪资解析会过滤明显乱码候选并从标题/正文回退提取 `20-35K×14薪`、`80-120USD/year` 等格式；后端 CORS 仅对 `/api/v1/job-radar/import` 放行 `chrome-extension://` / `moz-extension://` 预检，保持插件 Token 管理等账号接口不对扩展 Origin 开放。
- 新增 `job-radar-extension/popup.test.mjs` 回归测试，覆盖 Boss 薪资节点乱码时从正文提取薪资，以及通用英文薪资解析；插件 README 同步记录测试命令。
- 本轮验证通过：`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`node job-radar-extension/popup.test.mjs`、`cd backend && go test ./internal/httpx -run 'TestCORSAllows'`、`npm run backend:test`、`npm run backend:build`、`git diff --check`。生产后端已通过 `npm run deploy:killer:backend` 重建并重启；线上 `https://api.killer.wrenzeal.top/healthz` 返回 200，扩展 Origin 对 `/api/v1/job-radar/import` 的预检返回 204，非导入接口仍返回 403。

- 修复 Boss 直聘插件自动条件识别：`job-radar-extension` 版本提升到 `0.2.2`，插件现在会从 Boss 岗位标题推断 Job Keywords，从岗位地址归一化 Radar Locations，并从岗位标签/正文推断 Skills，避免导入时三个匹配条件都为空。猎聘适配器也同步保留标签供技能推断使用。
- 扩展回归测试 `job-radar-extension/popup.test.mjs` 新增 Boss 条件识别覆盖：薪资乱码回退、`后端/Backend/Golang` 关键词、`天津` 地点、`Golang/MySQL/Redis/Docker/微服务` 技能。
- 本轮验证通过：`python3 -m json.tool job-radar-extension/manifest.json >/dev/null`、`node --check job-radar-extension/popup.js`、`node job-radar-extension/popup.test.mjs`、`git diff --check`。

- 修复机会雷达刷新岗位源后插件导入岗位不显示的问题：`refresh=1` 现在只替换当前搜索范围里的 Remotive 在线源关联，不再删除同一 `searchFingerprint` 下 Boss/插件/手动导入岗位的 `job_search_results` 关联。这样数据库中已导入的岗位会继续随当前搜索范围返回，刷新源只更新在线源 30 条。
- 新增后端回归测试 `TestForceRefreshPreservesImportedJobsInScope`，覆盖“当前范围已有导入岗位 + 旧 Remotive 岗位，强制刷新后保留导入岗位、替换旧在线源岗位”的场景。
- 本轮验证通过：`cd backend && go test ./internal/jobradar`、`npm run backend:test`、`npm run backend:build`、`git diff --check`；生产后端已通过 `npm run deploy:killer:backend` 重建并重启，PM2 `kill-the-resume-backend` online，`https://api.killer.wrenzeal.top/healthz` 返回 `{"status":"ok"}`。


- 修复自定义简历模块在右侧预览和 PDF 导出中缺失的问题：新增共享 `projectCustomModuleSection` 投影，自定义模块标题即使字段暂未填写也会显示，文本、长文本和结构化日期字段在预览/PDF 中保持一致。
- 优化右侧预览双页拆分页：预览现在用隐藏测量纸张按实际模块高度计算第一页可容纳模块，减少预览长度/分页与 PDF 导出估算不一致的问题。
- 新增前端回归测试覆盖自定义模块空字段标题投影、可见字段与日期格式投影；本轮验证通过：`npm --prefix web run test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`git diff --check`。


- 统一右侧简历预览与 PDF 导出版式规划：新增 `web/src/lib/resume-paper-layout.ts` 作为共享 A4 纸张 metrics、内容块高度估算、压缩比例和分页来源，预览不再依赖 DOM 高度/模块数量切页，PDF 不再使用独立压缩启发式。
- 修复“预览显示更多页、实际 PDF 只有约一页半”的一致性问题：`ResumePreview` 与 `resume-pdf` 现在消费同一个 layout plan，保持最多两页 A4 的页数、压缩和溢出风险语义一致。
- 新增回归测试覆盖共享 layout plan 的双页/压缩决策和自定义模块块归属；本轮验证通过：`npm --prefix web run test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 修复右侧简历预览显示不全的问题：`ResumePreview` 不再按整模块塞入页面，而是直接渲染共享 `resume-paper-layout` 产出的 `PaperBlock[]` 分页；同一个长项目/长模块可以跨页显示，避免第一页 `.a4-paper` 裁切导致右侧预览少内容。
- 新增右侧预览“大屏预览”按钮：打开应用内全屏 A4 预览弹层，支持关闭按钮与 Esc，复用同一份分页/压缩计划，方便检查较小右栏难以看清的版式细节。
- 新增回归测试覆盖单个项目模块跨页规划，防止后续回退到模块级预览分页；本轮验证通过：`npm --prefix web run test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 修复右侧 A4 预览第一页末尾挤压/重叠的问题：移除预览内容容器的整页 `scaleY()` 二次压缩，改为通过 `--resume-density-scale` 对预览文字、行高、间距、项目缩进、技能标签和页脚做密度感知缩放，避免共享 layout plan 已经缩放后再次压扁内容。
- 调整大屏预览纸张尺寸：大屏 A4 宽度从过大的视口占比收敛到 `clamp(500px, 52vw, 640px)`，两页默认纵向滚动、超宽屏才并排，减少“纸很大但内容很小、空白很多”的误判。
- 新增回归测试防止 `ResumePreview` 恢复整页 `scaleY()` 双重压缩；本轮验证通过：`npm --prefix web run test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。

- 将右侧简历预览改为连续长页：普通预览不再显示多张 A4 分页纸，而是用一张随内容增长的 `resume-paper-surface` 渲染完整 `layoutPlan.blocks`，避免编辑时被分页高度/裁切干扰。
- 连续预览新增 PDF 分页参考线：根据共享 `layoutPlan.pages` 在长页中插入虚线提示下一页从哪里开始；大屏预览仍保留分页 A4/PDF 样式，PDF 导出继续使用独立 vector PDF 绘制逻辑，不按右侧连续预览导出。
- 新增回归测试覆盖“普通预览连续长页 + 大屏预览分页 A4”的源码边界；本轮验证通过：`npm --prefix web run test`、`npm --prefix web run typecheck`、`npm --prefix web run lint`、`npm --prefix web run build`、`npm --prefix web audit --audit-level=moderate`（0 vulnerabilities）、`python3 .codex/skills/project-memory/scripts/memory.py validate`、`git diff --check`。
