# Kill The Resume Job Radar Collector

这是 `kill-the-resume` 机会雷达的浏览器采集插件 MVP。它不是爬虫，不会自动批量抓取招聘平台；它只在你点击插件按钮后读取当前标签页的 URL、标题和用户选中的岗位正文，并调用后端 `POST /api/v1/job-radar/import` 把真实岗位写入机会雷达。

## 功能

- Chrome / Edge Manifest V3 插件。
- 读取当前页面 URL、标题、canonical 链接和选中文本。
- 支持补充来源、岗位名、公司、企业性质、地点、薪资、岗位正文。
- 支持填写机会雷达匹配条件：岗位关键字、地点、技能、排除关键词。
- 使用 Bearer Token 调用后端导入接口。
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
- `Bearer Token`
  - 登录 Kill The Resume 前端后取得的后端 JWT。
  - 当前 MVP 暂时手动粘贴；后续可以改成由主站生成插件专用 token。

点击 `Save` 保存配置。

## 使用方式

1. 登录 Kill The Resume，确认机会雷达当前搜索条件是你想要的方向。
2. 打开 Boss 直聘 / 猎聘 / 智联 / 拉勾 / 公司官网等岗位详情页。
3. 选中岗位职责和岗位要求正文。
4. 点击插件图标。
5. 检查自动填入的 URL、标题和正文，补充公司/地点/薪资等字段。
6. 填写或调整匹配条件，比如：
   - Job Keywords: `后端, Backend`
   - Radar Locations: `天津`
   - Skills: `Golang, Java`
   - Exclude Keywords: `外包, 驻场, 销售`
7. 点击 `Send`。
8. 回到 `/job-radar`，刷新或等待列表刷新，即可看到导入岗位和匹配百分比。

## 权限说明

`manifest.json` 使用 Manifest V3：

- `activeTab`：只有在你点击插件按钮后，临时允许插件读取当前标签页。
- `scripting`：用于在当前页面执行一小段脚本，读取选中文本、页面标题和 canonical 链接。
- `storage`：保存 API 地址、token 和常用匹配条件。
- `host_permissions`：仅允许请求当前生产 API 与本地开发 API：
  - `https://api.killer.wrenzeal.top/*`
  - `http://127.0.0.1:19304/*`
  - `http://localhost:19304/*`

如果你要连接其他后端域名，需要手动在 `manifest.json` 的 `host_permissions` 中增加对应域名，然后重新加载插件。

## 安全注意

- Token 保存在本机浏览器扩展存储里，不会主动发送给招聘网站页面。
- 不要把包含个人 token 的插件目录打包发给别人。
- 当前 MVP 建议只在自己的浏览器中使用。
- 后续更推荐后端增加“插件专用 token / 可撤销 token”。

## 开发校验

本项目没有构建步骤，修改后可直接在扩展管理页点击“重新加载”。基础静态校验：

```bash
python3 -m json.tool job-radar-extension/manifest.json >/dev/null
node --check job-radar-extension/popup.js
```

## 后续计划

- 插件专用 token 与权限撤销。
- 从常见招聘站点做更稳的字段提取。
- 导入后自动打开机会雷达详情。
- 支持岗位状态：待投递、已投递、面试中、拒绝、收藏。
