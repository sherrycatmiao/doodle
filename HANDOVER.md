# Doodle（嘟豆）项目接力文档

> 本文件用于跨对话窗口接力开发。读取此文件即可了解项目全貌、当前进度和下一步工作。

---

## 快速启动

```bash
cd F:\idea\todo\ai-todo
npm run tauri dev          # 启动开发模式
npx tsc --noEmit           # 类型检查
npx vite build             # 前端构建
```

调试：`Ctrl+Shift+I` 打开 DevTools / Rust 输出在终端 / DB 在 `C:\Users\1\AppData\Roaming\com.doodle.app\doodle.db`

---

## 项目概览

Windows 11 桌面待办应用，Tauri 2.0 + Rust + React 19 + TypeScript 5.8。

三个窗口：
| 窗口 | 尺寸 | 说明 |
|------|------|------|
| **Widget** | 480×700 | 半透明悬浮置顶，日历 + 可拖拽区块 + AI 输入 |
| **主面板** | 800×600 | 完整管理界面，默认隐藏，点击"主面板"按钮打开 |
| **AI 聊天** | 待创建 | 占位状态 |

---

## 最近完成的工作（本次对话）

### UI 全面重构（以 shadcn/ui 替换全部自定义样式）

**核心原则：** 只用 shadcn 语义类（`bg-background`/`text-muted-foreground`/`bg-accent`），彻底移除所有 `--app-*` 自定义 CSS 变量。

**已移除的自定义样式：**
- `index.css` — 移除全部 `--app-*` 变量和 `--icon-stroke` / `--widget-opacity`
- `ThemeProvider.tsx` — 只保留 `--primary` / `--ring` 覆盖（动态主题色），移除全部 `--app-*` 注入
- `GlassPanel.tsx` — 移除 `var(--app-*)` 引用，改为 `bg-card/80 backdrop-blur-xl border-border/50`
- `WidgetWindow.tsx` — 移除 `style={{ opacity: 'var(--widget-opacity)' }}`
- 全局无 `--app-` / `--widget-` / `--icon-` 引用残留

**主题系统改为 neutral base：**
- `index.css` 使用 shadcn default neutral 色板（纯灰阶，无色相）
- `ThemeProvider` 仅在 `--primary` 层面注入主题色，不影响其他变量

**主面板重构：**
- `PanelWindow.tsx` — 新顶栏布局（h-11），左品牌 + 右 shadcn Tabs
- `BlockSidebar.tsx` — w-52 精简侧栏，ScrollArea 列表，悬停操作按钮
- `BlockCardGrid.tsx`（新建） — 总览模式，区块卡片网格（grid-cols-2/3）
- `BlockDetailArea.tsx` — 详情模式，返回按钮，Collapsible 已完成折叠，所有交互用 shadcn Dialog/Popover/Tooltip

**Widget 重构：**
- 所有组件改用 shadcn 语义类，移除内联 `var(--app-*)` 色值

### 新增 shadcn 组件文件

`src/components/ui/` 下：
- `scroll-area.tsx`、`collapsible.tsx`、`tabs.tsx`、`tooltip.tsx`
- `label.tsx`、`slider.tsx`、`popover.tsx`（在之前对话中）

---

## 当前代码结构

```
src/
├── App.tsx                      # 窗口路由
├── index.css                    # 纯 shadcn neutral base + Tailwind 导入
├── types/index.ts               # TS 类型
├── store/
│   ├── useBlocksStore.ts        # 区块 CRUD
│   ├── useItemsStore.ts         # 事项 CRUD + 日历
│   ├── useSettingsStore.ts      # 主题 + AI 配置
│   └── useAIStore.ts            # AI 聊天（未使用）
├── components/
│   ├── theme/
│   │   ├── themeConfig.ts       # 3主题×2模式色板 + 优先级颜色/标签
│   │   └── ThemeProvider.tsx    # 仅注入 --primary + --ring
│   ├── ui/                      # 16个 shadcn 组件
│   ├── widget/                  # WidgetWindow + CalendarHeader + CalendarCell + MonthView + BlockCard + AIInputBar
│   ├── panel/                   # PanelWindow + BlockSidebar + BlockCardGrid + BlockDetailArea + SettingsPage
│   └── aichat/                  # AIChatWindow（占位）
└── src-tauri/
    ├── src/
    │   ├── lib.rs               # 命令注册
    │   ├── db.rs                # SQLite + 默认数据
    │   ├── models.rs            # Rust 结构体
    │   └── commands/
    │       ├── ai.rs            # ai_parse + ai_chat
    │       ├── blocks.rs        # 区块 CRUD
    │       ├── items.rs         # 事项 CRUD + 日历月数据
    │       ├── completions.rs   # 完成/取消完成
    │       └── settings.rs      # KV 配置
    ├── tauri.conf.json
    └── capabilities/default.json
```

完整 PRD: `F:\idea\todo\ai-todo\PRD.md`
完整项目快照: `F:\idea\todo\ai-todo\PROJECT_SNAPSHOT.md`

---

## 当前完成/待办清单

### ✅ 已完成

- [x] Rust 后端全部 20 个 IPC 命令 + SQLite 数据层
- [x] TypeScript 类型 + 4 个 Zustand store
- [x] 主题系统（3 主题 × 2 模式）
- [x] Widget 窗口全部组件（日历、区块网格、AI 输入）
- [x] 主面板全部组件（侧栏、总览卡片、详情 CRUD、设置）
- [x] shadcn/ui 全面集成 + 全部自定义 CSS 移除
- [x] neutral base 色板，干净克制的设计语言
- [x] AI 输入 → `ai_parse` 后端 → 自动创建事项

### 🔴 P0 — 核心体验

- [ ] **全局热键 Alt+Space** — `tauri-plugin-global-shortcut` 已安装。需要在 Rust `lib.rs` 的 `setup` 中注册快捷键，聚焦 Widget 的 AI 输入框（`window.__focusAIInput()`）。
- [ ] **AI 聊天窗口** — 后端 `ai_chat` 已实现。需要：
  1. 在 `tauri.conf.json` 添加 `aichat` 窗口配置
  2. 注册新窗口创建命令
  3. `AIChatWindow.tsx` 从占位改为完整对话界面
  4. 支持流式响应（SSE/EventSource）

### 🟡 P1 — 重要功能

- [ ] **周视图** — `CalendarHeader` 已有切换按钮，但 `WeekView` 组件未实现
- [ ] **自动顺延** — 后端 `run_auto_rollover` 已实现，前端未调用（应在应用启动时或每日首次打开时触发）

### 🟢 P2 — 增强

- [ ] **deadline 前 3 天脉冲动画** — 日历格子和事项列表已有红色边框，缺脉冲动画
- [ ] **SVG 图标系统** — 3 套主题化 SVG 图标集，替换 lucide-react
- [ ] 应用图标 + 打包签名

---

## 关键实现细节

### Rust IPC 通信模式

所有 Rust 函数通过 `#[tauri::command]` 暴露，前端用 `invoke()` 调用。例如：

```typescript
// 前端调用
const blocks = await invoke<Block[]>('get_blocks');
const item = await invoke<Item>('create_item', { input: { block_id, content } });
```

命令注册在 `src-tauri/src/lib.rs` 的 `cmd` 中。

### 完成/取消完成逻辑

1. `complete_item` → 记录 `completion_records`（含 `original_block_id`）→ 将 item 移入"已完成"区块
2. `uncomplete_item` → 删除对应 `completion_records` → 若无剩余记录，恢复 item 到原区块
3. 一条 item 可在不同日期多次完成/取消

### 日历数据流

1. `get_calendar_month(year, month)` → 返回 `CalendarMonthData`
2. 数据含 padding 日、is_today 标记、每个日期的 `ItemWithCompletion[]`
3. 日历格子点击 `complete_item`/`uncomplete_item` → 刷新 `calendarData`

### AI 解析数据流

1. 用户输入自然语言 → `invoke('ai_parse', { text })`
2. Rust 端调用配置的 LLM API（兼容 OpenAI 格式）
3. 返回 `Vec<AiParseResult>` → 前端逐条创建事项（自动创建不存在的区块）

---

## 技术债务和注意事项

1. **`useAIStore`** 已定义但未被使用（AI 聊天功能尚未实现）
2. `tauri-plugin-global-shortcut` 依赖已安装但未注册快捷键
3. react-grid-layout 的 `process is not defined` 警告已通过 vite `define` 处理
4. `noUnusedLocals: true` 保持开启，未使用的 import 会导致 TS 报错
5. Rust `ai.rs` 中 `ai_parse` 和 `ai_chat` 已实现但未在 `lib.rs` 注册为命令（需要确认当前状态）

---

## 设计语言快速参考

- **主色**：由 `widget_primary_color` 动态控制，默认 indigo (#6366f1)
- **字号层级**：标题 `text-sm`(14px) / 正文 `text-xs`(12px) / 辅助 `text-[10px]`(10px)
- **间距**：内容区 `p-4`，卡片间 `gap-3`，顶栏 `h-11`，侧栏 `w-52`
- **圆角**：`rounded-md`（6px）通用，`rounded-lg`（8px）卡片
- **卡片**：使用 shadcn `Card` + `CardHeader` + `CardContent` 标准结构
- **所有组件**：只用 `bg-background` / `text-foreground` / `text-muted-foreground` / `bg-accent` 等 shadcn 语义色，**禁止**使用自定义 hex 色或 `var(--app-*)`
