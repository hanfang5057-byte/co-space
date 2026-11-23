# 工作台前端组件约定

CoSpace 的审阅界面由 `packages/review-ui` 共享，DSH 使用宿主 React，WorkBuddy 自带 React。颜色优先使用 `space.css` 的 `--space-*` 语义变量及宿主 `--dsw-alias-*` 变量；新增控件沿用现有焦点轮廓、触屏尺寸和中英文文案。常用图标通过 `lucide-react` 按需导入，图标按钮必须提供可访问名称。

文本选区工具条使用 `@floating-ui/dom` 根据 Markdown 源码范围映射到的 DOM Range 定位，滚动和尺寸变化时更新，并通过 flip/shift 避免边缘裁切。文档批注的位置、连线及持久化仍由现有审阅逻辑负责。

## 组件库兼容边界

DSH 客户端构建要求 React 来自宿主，禁止将 `react-dom` 打入客户端。Radix Dialog 的包声明了 `react-dom` peer dependency，且其 Portal 默认挂载到 body；因此不能在尚未确认宿主提供对应模块及 Portal 容器行为时直接用于共享界面。目前继续使用原生 `dialog`。后续若宿主开放 React DOM，应先做单组件原型并验证焦点返回、Escape、遮罩、滚动锁定和侧栏容器，再决定是否采用。

文档首页搜索、筛选和排序是本地视图状态，不修改文档或审阅数据。编辑器、正文虚拟化及协作同步属于独立设计问题，不由基础组件升级隐式引入。


WorkBuddy 构建将共享 UI 和适配器的 React 导入统一解析到适配器的 React，并通过 esbuild 元数据检查仅有一份 React，避免 hooks 绑定到不同实例导致页面空白。
