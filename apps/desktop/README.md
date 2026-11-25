# CoSpace Desktop

桌面工作台由 Tauri 启动，共享 React UI 显示在系统 WebView 中；Tauri 管理本地 Node sidecar 的启动与退出。服务只绑定 `127.0.0.1`，数据默认保存在 `~/.cospace/webapp`，可通过 `COSPACE_WEB_HOME` 指定。UI 与 `/cospace-api` 同源提供。

Agent 接入页使用 `add-mcp` 和 Vercel `skills` 的程序化 API 检测并配置常见 Agent。用户逐个点击“一键接入”后，CoSpace 添加 MCP 并安装协作 Skill；其他 Agent 配置保持原样。接入后需重启 Agent。Skill 安装目标由 `skills` 库管理，MCP 的平台配置格式和 Agent 检测由 `add-mcp` 管理。

开发版要求 Node.js 24 或更高版本、Rust stable 和 `npm install`。在仓库根目录运行 `npm run desktop:dev` 进行开发，运行 `npm run desktop:package` 打包当前系统。最终发行文件统一整理在 `dist/releases/desktop/<平台>/`：macOS 提供 DMG，Windows 提供 MSI/NSIS 安装包，Linux 提供 deb/AppImage。Rust 中间编译文件保留在 `apps/desktop/src-tauri/target/`。Node 运行时作为 Tauri sidecar 随应用分发，用户无需安装 Node 或 npm。Skill 随应用一起打包，首次接入不需要下载 Skill；Agent 与桌面应用通过本机文件和 stdio MCP 通信。

macOS 本地打包会为 `.app` 生成并验证 ad-hoc 签名。正式对外分发需设置 `APPLE_SIGNING_IDENTITY` 使用 Developer ID 签名，并完成 Apple notarization；本地构建不会自动提交公证。
