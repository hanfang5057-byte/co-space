# CoSpace 桌面端方案

状态：已发布首个稳定版本。本文描述目标架构和迁移计划；实际实现与已发布产品仍以代码及 `docs/16-release-process.md` 为准。独立 Local Server 工作区及其 npm 更新器已移除，旧版网站安装器暂时保留。

## 目标与产品决策

以 Tauri 桌面应用取代独立 Local Server npm 产品。用户安装一次 CoSpace，无需自行安装 Node.js、npm 或 npx；Agent 通过本机 stdio MCP 使用文档，用户在桌面窗口审阅。文档和审阅记录仍保存在本机，离线可用；检查更新需要联网。DSH 插件保持独立产品、运行时和数据目录，共享审阅核心与能力契约。

不再发布新的 `@hanfang5057/co-space` Local Server npm 版本，不依赖其 npm 自动更新。已有 npm 版本及用户数据不应在迁移中删除。桌面安装包由 Tauri Updater 整包更新，包含桌面壳、Node、MCP 入口、本地服务及 UI，避免它们独立升级。

## 历史实现与复用边界

本地可见历史提交 `3dfb359` 中的 `apps/desktop` 使用 Tauri、随包 Node sidecar、本地 HTTP 服务和 WebView，提供 WorkBuddy 接入及多平台 Actions 构建；`9f7df14` 后移除了桌面产品。本地没有可检查的 dev 分支引用，实际实施前需对照 dev 的最新状态。历史方案是参考，不直接视为可发布或与当前 runtime 兼容。

复用 `packages/review-core`、`host-api`、`review-ui`、能力契约和通用传输层；保留 `packages/local-runtime` 中必要的本地服务、互斥、认证、会话和生命周期能力，移除 npm 专属更新代码及产品包装。桌面壳位于 `apps/desktop`，共享包不得依赖桌面或 DSH。不得借此改变 `review-core.js` 行为；如发现必须改变，先取得用户明确同意。

## 运行方式与 Agent 接入

1. 安装包携带经目标平台验证的 Node 运行时和构建好的服务、MCP 与 UI 资源。Tauri 启动桌面界面；本地服务只监听回环地址，使用随机令牌、受限文件权限及请求来源校验。WebView 和本地 API 的权限应最小化，限制导航和外部链接；不得沿用历史方案的宽松配置而不重新审查。
2. MCP 配置指向安装包中的稳定入口，以 stdio 启动；入口按需启动或连接同一数据目录的服务。Agent 可在桌面窗口未打开时工作；关闭窗口不应中断活动 MCP 请求。明确进程归属，空闲后退出或保持服务的策略须一致，不能由窗口退出无条件杀死共享 daemon。
3. 更新期间入口拒绝新连接并返回明确可恢复的提示；已连接 Agent 和请求完成后才停止服务。不得只根据窗口状态判断安全。运行实例、锁和凭据应区分安装及数据目录，防止多进程同时打开或升级同一数据库。
4. 先恢复 WorkBuddy 的用户主动一键接入：仅修改 CoSpace 条目并保留其他配置，写入失败可恢复；提供稳定入口路径和手动配置说明。其他 Agent 按实际兼容性逐一支持，不承诺自动配置。安装目录变化、卸载和重装后的配置失效要可检测并提供修复。
5. MCP 结果中的文档链接必须在桌面及无窗口场景可用，明确打开方式并验证；评论仍须用户明确操作才发送，接受或拒绝建议只能由用户决定。

## 更新与恢复

使用 Tauri 官方 updater，静态更新清单由官网的独立桌面通道提供，签名产物位于版本化 GitHub Release，避免与 DSH 的最新 Release 混用。检查和下载可后台进行；用户选择安装后，先保存编辑并进入排空状态，停止接收新连接，等待 MCP 会话、活动请求和审阅界面安全退出，再停止服务并安装。超时提供等待或取消，不能强制终止写入。Windows 安装与 macOS/Linux 重启行为分别验证。

更新产物必须使用 Tauri 更新私钥签名，客户端内置公钥；发布密钥只保存在受保护的 CI secret 中。使用支持版本绑定的 updater 并启用 `requireSignedVersion`。私钥丢失或泄露需要预先制定密钥轮换和用户迁移方案；签名验证不替代 macOS/Windows 系统代码签名。

安装成功不等于服务和数据可用：新版启动后检查服务健康、协议与数据布局。迁移前使用 SQLite 一致性备份，验证可恢复；数据库迁移必须事务化并记录布局版本。旧版不兼容新数据时禁止自动回滚运行旧代码，保留数据和备份并提供明确恢复步骤。安装失败或启动失败时保留原数据，并提供重新安装、诊断和从备份恢复的路径；不要承诺 Tauri 自动完成应用级回滚。保留升级前后的真实版本测试，包括磁盘空间不足、中断、损坏包、签名失败及并发连接。

### macOS ad-hoc 升级体验

首次通过浏览器下载安装未公证的应用时，Gatekeeper 可能阻止打开，用户可能需要在系统设置中确认。通过应用内 updater 安装新版时，是否再次出现拦截取决于 macOS 版本、安装方式和设备策略，不能承诺仅首次提示；浏览器重新下载 DMG 也可能触发新的检查。Tauri 更新签名验证发布者持有更新私钥，但不等同于 Apple 开发者身份或公证。受管理设备可能不允许用户自行放行；不建议关闭全局安全功能或以移除隔离属性作为默认安装步骤。若未来申请麦克风、辅助功能等系统权限，还需验证 ad-hoc 更新后是否需要重新授权。

发布前在干净、启用 Gatekeeper 的 Mac 上，用浏览器下载正式路径的 A 版，记录首次安装和打开提示；用实际 GitHub Actions 产物及正式 updater 清单从 A 升级到 B，验证签名、安装、重启、再次启动和内置 Node/MCP，记录是否再次提示。再测试浏览器重新下载 B、至少一次 B 到 C 更新，以及有代表性的受管理设备策略；按实际支持范围覆盖 macOS 版本和 arm64/x64。记录环境与结果，发布说明如实描述，不能据单台结果保证所有设备表现相同。参见 [Apple 安全打开应用](https://support.apple.com/en-us/102445)及 [Tauri macOS 签名](https://v2.tauri.app/distribute/sign/macos/)。

## Local Server 剥离边界

这里下线的是独立 npm 产品和其更新机制，不是删除桌面端仍需要的本地进程、MCP 通道或持久化。下表按当前 main 代码梳理，实施前再次核对依赖和 dev 差异。

| 当前范围 | 处理方式 |
|---|---|
| `apps/local-server/`：npm 包、CLI、WorkBuddy installer、构建/打包脚本、daemon 入口及浏览器客户端 | 停止作为独立 workspace 和 npm 交付；先将桌面仍需的服务入口、审阅页面与资源构建迁到桌面产品或合适的共享包，再删除产品专属 CLI、installer、npm manifest 和包装。WorkBuddy 接入由桌面实现替代并验证。 |
| `packages/local-runtime/src/service.js`、`manager.js`、`mcp-client.js`、`paths.js` | 保留并按桌面需要重构：本地认证、互斥、服务启动、协议、会话、活动请求和数据路径仍必需。移除 npm 下载、定时检查、版本暂存及升级控制专属路径；保留或重建布局兼容性、失败恢复和安全停机保障。包名可按职责调整，但共享包不能依赖 `apps/desktop`。 |
| `apps/local-server/src/daemon-entry.js` 和 runtime 更新相关逻辑 | 移除 npm registry、完整性校验、下载和自动切换，不再提供 npm 升级、回滚命令。Tauri 负责整包更新；桌面需单独实现排空、版本兼容和恢复，不把现有保障一并删除。 |
| `review-core`、`host-api`、`review-ui`、`transport-mcp`、`transport-http`、`adapter-contract` | 保留为共享能力；DSH 和桌面依赖向内，不能引入产品目录依赖。保留现有领域语义、主题约束、浏览器鉴权以及 DSH 独立数据和运行时。 |
| 根 `package.json`、锁文件、`scripts/dev-local.mjs`、`scripts/verify-adapter-boundaries.mjs`、`scripts/test-fast.mjs`、站点构建脚本 | 删除或替换 Local Server workspace、命令及架构断言；新增桌面构建、开发及验证入口。重新生成锁文件，确保 DSH 的构建、打包和隔离加载检查仍通过。 |
| `test/local-runtime-*`、`test/local-upgrade-layout.test.js`、`test/local-protocol-contract.test.js`、`test/mcp-dual-contract.test.js`、`test/workbuddy-installer.test.js`、MCP 和文档导航测试 | 按行为迁移：保留认证、并发、协议、恢复、数据布局、MCP 契约及深链接测试，新增桌面排空和迁移测试；仅删除 npm 更新和旧 installer 专属断言，不因实现删除而丢失安全回归覆盖。 |
| 根中英文 README、`apps/site/`、`docs/09`、`docs/14`、`docs/16`—`19`、`specs/local-server/`、`AGENTS.md` | 逐项更新产品入口、架构、安装、发布和主题引用；将旧规格标记为历史或迁移其仍有效要求。站点和 README 在桌面产物真实可用后切换；更新仓库规范中的双入口与发行约束，不能提前宣称已发布。 |

剥离按兼容性分阶段进行：先建立不依赖 npm 包路径的桌面运行入口和资源构建，完成契约、DSH 和迁移测试；再移除 Local Server 产品代码与 npm 更新实现；最后在桌面产物发布并验证后切换用户入口。开发分支中允许先完成代码剥离，但发布切换前必须保证旧用户有可验证的迁移路径。已有 npm 版本不受源码删除影响，不能通过修改源码暗示旧包已被撤销。

## 现有 Local Server 用户迁移与下线

首次启动检查旧 `~/.cospace/webapp` 和 `COSPACE_WEB_HOME` 配置；不静默覆盖、删除或合并数据。优先选择用户确认后迁移到桌面专属数据目录：先要求旧服务停止并断开 Agent，取得排他锁，用 SQLite 安全备份复制全部必要数据及元信息，验证完整性和文档、建议、评论数量及内容可读后再启用。源数据保留；失败可重试或取消，不能生成两个可写副本而误导用户认为会同步。自定义路径提供手动选择和清晰提示。DSH 数据不参与迁移。

在桌面首个可用版本经过迁移验证后，更新中英文 README、网站和 Agent 配置指引，标记 npm 产品停止维护并指向桌面下载和迁移说明；不要暗示 npm 包已删除或桌面版已发布。发布后提供旧版本到桌面版的用户指引，并告知旧 MCP 配置需替换。保留已有 npm 制品与用户数据；是否设置 npm deprecate 属于实际发布操作，另行按授权执行。同步调整 `docs/16-release-process.md` 和架构规范，使桌面成为正式发布轨道、DSH 轨道不受影响。

## GitHub Actions 构建与发布

GitHub Actions 可实现此流程；[Tauri 官方提供 GitHub Actions 工作流](https://v2.tauri.app/distribute/pipelines/github/)。PR 只构建、测试并上传临时产物，不接触发布密钥；发布从受保护的版本 tag 和环境执行，最小化 `contents: write` 权限，固定并审查第三方 action 版本。发布任务使用一致的桌面版本来源和 `desktop-vX.Y.Z` tag，不复用 DSH tag。

当前首发构建目标为 macOS arm64/x64 和 Linux x64 的 deb、AppImage；Windows 暂停发布，本地仍可构建 Windows 调试包。后续恢复 Windows 发布前，需配置代码签名证书，并在干净系统验证 MSI/NSIS 安装、更新与签名。验收后可增加其他 Linux 包格式。其他架构和 UOS 在对应 runner、系统依赖和目标机器上验证后再宣称支持。Linux deb 默认由包管理器或手动安装更新；AppImage 可使用 Tauri updater，不应把两者的更新路径混同。确认各平台的安装格式和 Tauri updater 产物一一匹配。

流水线先安装锁定依赖、运行共享检查和桌面测试，随后在目标平台构建并验证内置 Node 架构、sidecar、stdio MCP、安装资产和更新签名；产物集中到 draft release。当前没有 Apple 开发者账号，macOS 先使用 ad-hoc 签名，不公证；GitHub Actions 无需 Apple 证书即可构建。该签名不能证明开发者身份或消除 Gatekeeper 提示，用户可能需要在“隐私与安全性”中确认打开，受管理设备可能不允许。发布页应如实说明，并在干净 macOS 上验证下载、首次启动及更新后启动；以后取得 Developer ID 时再升级为正式签名和公证。恢复 Windows 发布时，再配置正式代码签名并验证证书与时间戳；Tauri 更新签名与系统代码签名相互独立，仍须验证。所有签名密钥使用受保护 secrets，禁止输出到日志或暴露给不受信任 PR。

所有矩阵构建成功后，验证每个平台的版本、摘要、签名、安装与升级，并在干净系统或对应测试环境完成人工验收；再发布 Release。发布后从公开版本下载并验证全部更新产物，准备官网的 `apps/site/desktop/latest.json`，经审阅后随 Pages 整站部署切换正式更新清单。清单引用的所有文件必须先可下载且与签名匹配，避免部分发布；验证目标用户网络可访问 Release 和更新地址，必要时提供经验证的镜像。未通过平台验收的构建只能标为测试产物；macOS 未公证状态及安装限制必须明确披露。GitHub Actions 可自动化构建和签名，但不能代替证书准备、目标设备验收和发布授权。详细步骤见 `docs/16-release-process.md`。

## 验收与实施顺序

1. 对照 dev 和当前 main 梳理差异，恢复桌面壳并适配当前共享服务；确认数据目录、入口路径、进程归属和网络安全设计。
2. 实现内置 Node、多平台构建和 WorkBuddy 接入；在无系统 Node/npx 的干净环境验证安装、创建文档、Agent 修改、用户审阅和退出恢复。
3. 实现安全迁移和更新协调，覆盖旧 npm daemon 正在运行、多 Agent、窗口关闭、崩溃、异常重启和不兼容数据布局。
4. 配置签名、CI draft release 与 updater，执行至少一次真实的旧版到新版更新及失败恢复；检查敏感信息不进入产物和日志。
5. 验收完成并发布桌面版后，再切换网站、README、发布文档和 npm 下线指引。实现过程中保持 DSH 包构建和宿主集成边界不变。

参考：[Tauri Updater](https://v2.tauri.app/plugin/updater/)、[GitHub Actions 发布](https://v2.tauri.app/distribute/pipelines/github/)、[macOS 签名](https://v2.tauri.app/distribute/sign/macos/)、[Windows 签名](https://v2.tauri.app/distribute/sign/windows/)。
