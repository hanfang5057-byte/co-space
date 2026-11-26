# CoSpace Desktop

桌面工作台由 Tauri 启动，共享 React UI 显示在系统 WebView 中；Tauri 管理本地 Node sidecar 的启动与退出。服务只绑定 `127.0.0.1`，数据默认保存在 `~/.cospace/webapp`，可通过 `COSPACE_WEB_HOME` 指定。UI 与 `/cospace-api` 同源提供。

Agent 接入页当前只自动检测并配置 WorkBuddy。用户点击“一键接入”后，CoSpace 只更新自己的 MCP 条目并复制协作 Skill，保留其他配置；接入后需在 WorkBuddy 中启用连接器并重启。MCP 配置写入 `~/.workbuddy/mcp.json`，Skill 安装到 `~/.workbuddy/skills/cospace-review/`。CodeBuddy 暂无自动接入支持。DSH 插件需按其独立安装说明手动安装。

开发版要求 Node.js 24 或更高版本、Rust stable 和 `npm install`。在仓库根目录运行 `npm run desktop:dev` 进行开发；桌面 UI 源码变更会自动重建并刷新页面，刷新会重置当前页面状态。Node sidecar 与 Rust 源码变更需重启开发进程。运行 `npm run desktop:package` 打包当前系统。最终发行文件统一整理在 `dist/releases/desktop/<平台>/`：macOS 提供 DMG，Windows 提供 MSI/NSIS 安装包，Linux x86_64 提供 deb/AppImage。Linux 包需在 Linux 构建机上运行该命令；macOS 本机打包只生成 macOS 产物。统信 UOS 可在 UOS/Linux x86_64 构建机上执行相同命令生成 `.deb` 和 AppImage。仓库的 `Build CoSpace Desktop` GitHub Actions 工作流会在匹配路径变更的 PR 和 `desktop-v*` 标签上构建 macOS、Windows 与 Ubuntu 产物并上传。Rust 中间编译文件保留在 `apps/desktop/src-tauri/target/`。Node 运行时作为 Tauri sidecar 随应用分发，用户无需安装 Node 或 npm。Skill 随应用一起打包，首次接入不需要下载 Skill；Agent 与桌面应用通过本机文件和 stdio MCP 通信。

统信 UOS 的实际安装与运行兼容性仍需在目标 UOS 版本上验收；不同 CPU 架构或系统版本可能需要对应的构建机与依赖。

macOS 本地打包会为 `.app` 生成并验证 ad-hoc 签名。正式对外分发需设置 `APPLE_SIGNING_IDENTITY` 使用 Developer ID 签名，并完成 Apple notarization；本地构建不会自动提交公证。
