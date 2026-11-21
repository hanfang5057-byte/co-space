# Univer 评估报告

日期：2026-11-21  
评估对象：Univer 1.6.0（Docs / Sheets）  
Spike：`research/univer-spike/`  
结论：**Univer 的编辑能力成熟，但不是当前 open-text Space 的 drop-in replacement；建议不要直接替换存储与同步内核。**

---

## 1. 实测范围

- 环境：Linux、Chrome、React 18.3、Vite 7、`@univerjs/*` 1.6.0
- 实际跑通：
  - `@univerjs/preset-docs-core` 1.6.0：文档可编辑、可保存快照
  - `@univerjs/preset-sheets-core` 1.6.0：表格可编辑、可保存快照
- 未跑通：
  - 没有 `@univerjs/preset-slides-core` 1.6.0
  - `@univerjs/slides` / `@univerjs/slides-ui` 停留在 1.3.1，依赖 `@univerjs/core@1.3.1`
  - Docs/Sheets 1.6.0 与 Slides 1.3.1 不能按 Univer 官方“所有 `@univerjs/*` 同版本”的要求共存

截图：

- [Docs](univer-spike/screenshots/docs.png)
- [Sheets](univer-spike/screenshots/sheets.png)

---

## 2. 存储格式：不是 Markdown / CSV / Marp

### Docs

`fDocument.save()` 返回 Univer 文档快照，核心是：

```json
{
  "body": {
    "dataStream": "Univer 文档测试\r\n",
    "textRuns": [{ "st": 0, "ed": 12, "ts": { "cl": { "rgb": "#1B1C1F" } } }],
    "paragraphs": [{ "startIndex": 11, "paragraphId": "para_...", "paragraphStyle": {} }],
    "sectionBreaks": [{ "sectionId": "section_...", "startIndex": 12 }]
  },
  "documentStyle": { "pageSize": { "width": 960, "height": 1122.67 } }
}
```

这是结构化富文本，不是 Markdown。把它转回 Markdown 会丢样式/段落/表格等；Univer 开源核心没有 Markdown 导入导出。

### Sheets

`fWorkbook.save()` 返回 `cellData`：

```json
{
  "sheets": {
    "sheet-id": {
      "cellData": {
        "0": {
          "0": { "v": "收入", "s": "style-id", "t": 1 }
        }
      }
    }
  }
}
```

不是 CSV。Univer 开源 Sheets 包内没有 CSV 解析/序列化；CSV/TSV 导出属于 `@univerjs-pro/*` 的 exchange 能力，需要转换后端与商业 License。

### Slides

没有 1.6 的 Slides presets；1.3.1 的 Slides 与 1.6 Docs/Sheets 版本线冲突。即使单独安装，也没有 Markdown/Marp 兼容。

---

## 3. 导入/导出不是开箱即用

官方文档明确：

- Docs：`.doc/.docx` 导入，`.docx` 导出
- Sheets：`.xls/.xlsx/.csv/.tsv` 导入，`.xlsx/.csv/.tsv` 导出；CSV/TSV 只导出单个 worksheet，不含工作簿格式和其他 sheet
- Slides：`.ppt/.pptx` 导入，`.pptx` 导出
- 这些 API 需要 **conversion backend**，使用 `@univerjs-pro/exchange-client` / `@univerjs-pro/docs-exchange-client` 等
- `@univerjs-pro/*` 的 License 是 **Univer Office SDK Licensing**，不是 Apache-2.0

也就是说：

- 开源 `@univerjs/*` 能编辑，但**不能免费、离线、直接导入/导出 Office 文件或 CSV**
- 更不能直接读写 Markdown / Marp

---

## 4. 包体

Spike 生产构建（Docs + Sheets，含语言 chunk）：

| 指标 | 数值 |
|---|---:|
| 总 raw | 11.4 MB |
| 总 gzip | 2.74 MB |
| 主 JS raw | 6.70 MB |
| 主 JS gzip | 1.69 MB |
| CSS | 127 KB |

当前 DSH Space `client.js`：

| 指标 | 数值 |
|---|---:|
| raw | 424 KB |
| gzip | 84 KB |

Univer 即使按需加载，Docs+Sheets 主包也约为当前插件的 **20 倍 gzip**，还没算 Slides。对 DSH Web 首屏/插件加载是明显成本。

---

## 5. 与当前 Space 架构的冲突

### 5.1 开放文本

当前核心卖点：

- Markdown/CSV/Marp 可被 Agent 直接读写
- 可 git diff
- 可用 3-way merge

Univer 快照是 JSON 结构，不是文本语义：

- Agent 不能直接读 Markdown
- `git diff` 失去可读性
- `.sync-conflict-*` 冲突变成两份 JSON 的快照冲突，无法做可靠三方合并
- 只能“选一份”，或引入 Univer 自己的协作服务

### 5.2 文件级异步同步

Syncthing 同步的是文件。Univer 快照每次编辑可能重写整个 JSON：

- 冲突粒度从“行/段”退化为“整个文档”
- 现有 `node-diff3` 基线合并基本失效
- 与“方案 A：文件级异步协同”不一致

### 5.3 Agent 工具

现有 `doc_create` / `file_read` / `file_edit` / `sheet_read` / `slides_read` 都建立在开放文本上。采用 Univer 后需要：

- 新增 Univer 快照读写工具
- 或做 Markdown/CSV ↔ Univer 双向转换
- 或让 Agent 直接操作 Univer JSON（不现实）

### 5.4 Slides 版本断档

Docs/Sheets 1.6.0，Slides 1.3.1：

- 无法在同一 Univer 实例中稳定共存
- 需要锁定整套 1.3.1，或等 Slides 1.6
- 1.3.1 的 UI/依赖与 1.6 不兼容

---

## 6. DSH 集成成本

技术上可行：

- Univer 的 React peer 支持 React 18，DSH Web 也是 React 18
- 可用一个容器 div + `createUniver` 挂载
- 可把 Univer 作为独立 client chunk 动态加载

但需要额外解决：

- Univer 全局 CSS 与 DSH tokens/主题隔离（可能需要 Shadow DOM 或 iframe）
- 编辑器工具栏与 DSH 页面布局/快捷键冲突
- 字体、深色模式、语言资源（spike 中 Docs locale 仍显示 `enUS`，需要正确 merge design locale）
- Worker/Canvas 在 DSH Electron/Web 的兼容性
- 打包 CSS 注入、动态 chunk、体积预算

这不是“引一个组件”那么简单。

---

## 7. 决策建议

### 不建议：直接把当前 Space 的存储换成 Univer 快照

会同时失去：

- 开放文本
- Agent 可读可写
- git diff
- 行级/段级三方合并
- Markdown/CSV/Marp 的轻量同步

这等于换产品，而不是换编辑器。

### 如果目标是“富 Office 编辑体验”，建议单独立项

可选分支：

1. **Univer 只做 Sheets**，用 CSV 手动导入/导出；Docs/Slides 暂不接。
   - 仍需接受快照与 CSV 双格式/转换损失。
2. **Univer 做完整 Office 模式**，存储改为 Univer 快照 + 协作服务。
   - 放弃 open-text 内核；需要重新设计 Agent 工具与同步冲突模型。
3. **保留 open-text，编辑层用 CodeMirror + react-data-grid**。
   - 不是“从 0 研发编辑器”，而是用两个成熟库补编辑体验。
   - 与现有存储、Agent、Syncthing、3-way merge 完全兼容。
   - 包体远小于 Univer。

### 推荐

**当前产品继续 open-text 内核，不采用 Univer 作为编辑器/存储核心。**

如果一定要评估 Univer，先把范围压到：

```text
只做 Sheets + CSV
不做 Docs/Slides
不做 Office 导入导出
不做协作
```

用 1-2 天验证“Univer 快照 ↔ CSV”的转换损失和冲突体验；再决定是否值得为富文本付出架构代价。

---

## 8. 复现

```sh
cd research/univer-spike
npm install
npm run dev
# http://127.0.0.1:5174/
```

在 Docs/Sheets 编辑后点“保存快照”，即可看到 Univer 原生 JSON。

构建体积：

```sh
npm run build
```
