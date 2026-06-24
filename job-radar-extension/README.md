# Kill The Resume Job Radar Collector

这是 `kill-the-resume` 机会雷达的浏览器采集插件。它不是爬虫，不会自动批量抓取招聘平台；它只在你主动点击插件按钮后读取当前打开的岗位详情页，自动填充岗位名、公司、地点、薪资和岗位正文，然后调用后端 `POST /api/v1/job-radar/import` 写入机会雷达。

## 功能

- Chrome / Edge Manifest V3 插件。
- 用户主动点击插件时读取当前页 URL、标题、canonical 链接、页面文字和选中文本。
- 优先适配 Boss 直聘岗位详情页；内置猎聘和通用网页兜底解析。
- 自动填充来源、岗位名、公司、企业性质、地点、薪资、岗位正文；Boss/猎聘页面会额外从岗位标题、地点和技能标签/正文推断 Job Keywords、Radar Locations、Skills；薪资解析会过滤明显乱码候选，并从页面正文回退提取。
- 字段可在弹窗中手动修正，手动输入只作为自动解析失败或字段不准时的兜底。
- 支持可选填写机会雷达匹配条件：留空时使用账号在 `/job-radar` 页面保存的当前搜索条件；填写后作为本次导入覆盖条件。
- 使用 `/job-radar` 页面生成的 `ktrp_` 插件专用 Token 调用后端导入接口，不需要复制登录态 Token。
- 设置保存在本机扩展存储 `chrome.storage.local`。

## 安装到本地浏览器

1. 打开 Chrome 或 Edge。
2. 进入 `chrome://extensions` 或 `edge://extensions`。
3. 开启 **Developer mode / 开发者模式**。
4. 点击 **Load unpacked / 加载已解压的扩展程序**。
5. 选择本目录：`job-radar-extension/`。
6. 把插件固定到浏览器工具栏。

## 配置

插件弹窗中需要配置：

- `API Base URL`
  - 生产默认：`https://api.killer.wrenzeal.top/api/v1`
  - 本地开发：`http://127.0.0.1:19304/api/v1`
- `Plugin Token`
  - 登录 Kill The Resume 主站，进入 **机会雷达 `/job-radar` / 插件 Token 管理** 面板。
  - 点击 **生成并复制**，复制 `ktrp_` 开头的插件专用 Token。
  - 把这个 Token 粘贴到插件弹窗；它只允许导入机会雷达岗位，不能访问简历或账号接口。

点击 `Save` 保存配置。

## 使用方式

1. 登录 Kill The Resume，进入 `/job-radar` 页面生成并复制 `ktrp_` 插件 Token；确认当前搜索条件是你想要的方向。
2. 打开 Boss 直聘 / 猎聘 / 公司官网等岗位详情页。
3. 点击浏览器工具栏里的插件图标。
4. 插件会自动读取当前页并填充岗位字段。
5. 如果字段不准，点击 `Re-read Page` 重新读取，或直接手动修正字段。
6. 插件会优先从 Boss/猎聘页面自动填充 Job Keywords / Radar Locations / Skills；如果这些字段仍留空，后端会使用你账号在 `/job-radar` 页面最近保存的当前搜索条件。
7. 只有当你想让这次导入归属到另一个搜索范围时，再填写插件里的覆盖条件，比如：
   - Job Keywords: `后端, Backend`
   - Radar Locations: `天津`
   - Skills: `Golang, Java`
   - Exclude Keywords: `外包, 驻场, 销售`
8. 点击 `Send`。
9. 回到 `/job-radar`，刷新或等待列表刷新，即可看到导入岗位和匹配百分比。

## 自动解析边界

- 只解析当前打开的页面，不批量抓取、不自动翻页、不后台静默采集。
- 对 Boss 直聘使用专门选择器，优先读取岗位标题、薪资、公司、标签、地点和详情正文。
- 对猎聘和其他网页使用通用选择器与文本规则兜底。
- 如果页面结构变化、岗位正文被登录态/反爬遮挡，插件会保留可编辑字段，你可以手动补齐后发送。
- 插件自动解析到的岗位地点和公司类型只作为岗位详情字段保存，不会自动变成本次雷达搜索范围；这样可以避免导入后写入到另一个搜索指纹，导致 `/job-radar` 当前列表看不到岗位。

## 权限说明

`manifest.json` 使用 Manifest V3：

- `activeTab`：只有在你点击插件按钮后，临时允许插件读取当前标签页。
- `scripting`：用于在当前页面执行一小段脚本，读取 URL、标题、canonical、页面文字和选中文本。
- `storage`：保存 API 地址、插件 Token 和常用匹配条件。
- `host_permissions`：仅允许请求当前生产 API 与本地开发 API：
  - `https://api.killer.wrenzeal.top/*`
  - `http://127.0.0.1:19304/*`
  - `http://localhost:19304/*`

如果你要连接其他后端域名，需要手动在 `manifest.json` 的 `host_permissions` 中增加对应域名，然后重新加载插件。

## 安全注意

- 插件 Token 保存在本机浏览器扩展存储里，不会主动发送给招聘网站页面。
- 不要把包含个人 Token 的插件目录打包发给别人。
- 插件 Token 可以在 `/job-radar` 页面撤销；如果怀疑泄露，立即撤销并重新生成。
- 当前版本建议只在自己的浏览器中使用。

## 开发校验

本项目没有构建步骤，修改后可直接在扩展管理页点击“重新加载”。基础静态校验：

```bash
python3 -m json.tool job-radar-extension/manifest.json >/dev/null
node --check job-radar-extension/popup.js
node job-radar-extension/popup.test.mjs
```

## 后续计划

- 根据真实 Boss/猎聘页面继续补强字段选择器。
- 增加智联、拉勾、前程无忧等站点适配器。
- 导入后自动打开机会雷达详情。
- 支持岗位状态：待投递、已投递、面试中、拒绝、收藏。
