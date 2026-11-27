# CoSpace Desktop

Tauri 桌面入口使用随包 Node 运行时、本地服务和共享审阅 UI。Agent 使用 stdio MCP；用户数据默认位于 `~/.cospace/desktop`，可通过 `COSPACE_DESKTOP_HOME` 指定。首次启动可选择导入旧 Local Server 数据或创建新空间。导入前需停止旧服务，源文件会保留；新旧空间不会同步。DSH 数据保持独立。

## 安装

桌面端已正式发布：从 [GitHub Releases](https://github.com/hanfang5057-byte/co-space/releases/latest) 下载对应平台安装包——macOS arm64/x64 `.dmg`，Linux amd64 `.deb` / `.AppImage`，附件含 `SHA256SUMS` 与各平台签名。AppImage 可通过内置更新通道自动升级；deb 建议使用系统包管理器升级。macOS 安装包为 ad-hoc 签名且未公证，首次启动如被 Gatekeeper 拦截，右键应用选择打开。Windows 暂停发布，本地调试构建仍可用。

WorkBuddy 接入使用已安装的 CoSpace 程序和 `--mcp` 参数，AppImage 不会把临时挂载目录写进配置。移动或卸载应用后需在桌面应用内重新接入。接入会保留其他 MCP 条目；同名配置或 Skill 无法确认归属时会停止并提示检查。

## 开发

桌面端开发和打包需要 Node.js 24 或更高版本。在仓库根目录执行 `npm install` 后，运行 `npm run dev:desktop` 启动开发版，运行 `npm run smoke --workspace apps/desktop` 验证 sidecar 与 MCP。开发版会监视桌面 UI，改动后重新构建并整页刷新；Node 服务/MCP 或共享包改动需要重启开发命令。启动时会安全停止空闲的旧版本服务；若 Agent 或审阅页面仍连接，会提示先断开。`npm run package:desktop:local` 会按当前操作系统构建本机调试包并启动它：macOS 打开 `.app`，Windows 打开 NSIS 安装器，Linux 启动 AppImage。Linux 本地调试不构建 deb；正式构建矩阵包括 macOS arm64/x64 和 Linux deb/AppImage。完整桌面构建还需 Rust 工具链及相应平台依赖。

## 发布

发布环境与签名密钥已配置在受保护的 `desktop-release` 环境中（tag 策略限定 `desktop-v*`，需审批人批准）。每个新版本仍须按 [release process](../../docs/16-release-process.md) 在验收通过后发布：签名草稿工作流由 `desktop-vX.Y.Z` 标签自动触发（也可在标签上手动重跑），它只创建草稿，不自动发布或推广更新。开发构建默认没有可信更新公钥，不能用于发布更新；正式构建由流水线注入持久化的 `COSPACE_UPDATER_PUBLIC_KEY` 和安全保管的 `TAURI_SIGNING_PRIVATE_KEY`，并在发布前验签。
