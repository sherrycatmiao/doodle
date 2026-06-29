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
| **Widget** | 1440×900 | 半透明悬浮，固定在桌面背景，Alt+Space 唤出 |
| **主面板** | 800×600 | 完整管理界面，默认隐藏，点击"主面板"按钮打开 |
| **AI 聊天** | 500×600 | 默认隐藏，从 Widget 底部机器人图标打开 |

---

## 最近完成的工作

### Alt+Space 全局热键
- `tauri-plugin-global-shortcut` 注册 `Alt+Space` → 显示并聚焦 Widget 窗口
- Rust `desktop_pin` 模块：`pin_to_desktop` 将 Widget 设为桌面子窗口（WorkerW）→ Win+D 不隐藏
- Alt+Space 时 `bring_to_front` 解除桌面绑定提到前台，3秒后自动恢复桌面固定
- Widget 失去焦点不会闪烁（没有 blur 监听器）

### AI 聊天窗口
- `tauri.conf.json` 添加 aichat 窗口配置（500×600，默认隐藏）
- `AIChatWindow.tsx` 从占位改为完整对话界面：消息气泡、自动滚动、加载动画、Enter 发送
- `useAIStore.ts` 修复：用户消息立即显示、错误处理
- Widget 底部添加 AI 聊天入口按钮（机器人图标）
- `lib.rs` 添加 `open_aichat_window` 命令

### 悬浮窗放大 + 左右布局
- Widget 尺寸改为 1440×900
- 布局重构：左 60%（日历） + 右 40%（区块列表），底部 AI 输入栏
- 日历格子改为 `min-h-[85px]`，每格最多显示 **6 行**待办
- 区块列表纵向排列

### 跨窗口实时联动
- 新增 `src/lib/events.ts` 事件总线：`emitDataChanged` / `emitSettingsChanged`
- 关键：Tauri 2 的 `emit()` 只在当前窗口内广播，所以新增 Rust 命令 `notify_all` → `app.emit()` 广播到全部 WebView
- `useBlocksStore`、`useItemsStore`、`useSettingsStore` 每次写操作后调用 `emitDataChanged` 或 `emitSettingsChanged`
- WidgetWindow 和 PanelWindow 各自监听 `onDataChanged` / `onSettingsChanged` 自动重刷

### 事项勾选修复
- **根因**：`fetchItems(blockId)` 会把 store 的 items 覆写为仅一个区块的数据
- 修复：`useItemsStore.fetchItems()` 改为无参数，永远拉取**全部**事项（`blockId: null`）
- BlockCard、BlockDetailArea 全部改为调用 `fetchItems()`
- 完成/取消完成操作后自动 `fetchItems()` + `emitDataChanged()`

### AI 区块匹配逻辑调整
- AI 解析后：精确匹配 → 模糊匹配（名称包含关系）→ 回退到"待办" → 回退到 `blocks[0]`
- 不再自动创建新区块
- 如果 AI 指定了日期才设 `due_date` 和 `is_date_linked`

### 主题颜色修复
- `ThemeProvider` 新增 `primaryColor` prop，各窗口传入自己的颜色
- Widget → `config.widget_primary_color`
- Panel → `config.panel_primary_color`
- AIChat → `config.panel_primary_color`
- `PanelWindow` 补上 `onSettingsChanged` 监听

### 周视图移除
- `CalendarHeader.tsx` 移除视图切换按钮，只保留月份导航

---

## 当前代码结构

```
src/
├── App.tsx                      # 窗口路由
├── index.css                    # 纯 shadcn neutral base + Tailwind 导入
├── lib/
│   ├── utils.ts                 # cn() 工具函数
│   └── events.ts                # 跨窗口事件总线（notify_all 广播）
├── types/index.ts               # TS 类型
├── store/
│   ├── useBlocksStore.ts        # 区块 CRUD + emitDataChanged
│   ├── useItemsStore.ts         # 事项 CRUD + 日历 + 完成 + emitDataChanged
│   ├── useSettingsStore.ts      # 主题 + AI 配置 + emitSettingsChanged
│   └── useAIStore.ts            # AI 聊天状态
├── components/
│   ├── theme/
│   │   ├── themeConfig.ts       # 3主题×2模式色板 + 优先级颜色/标签
│   │   └── ThemeProvider.tsx    # 注入 --primary/--ring + dark class，接受 primaryColor prop
│   ├── ui/                      # 16个 shadcn 组件
│   ├── widget/
│   │   ├── WidgetWindow.tsx     # 根组件（左日历右区块列表 + 底部 AI 输入 + 跨窗口监听）
│   │   ├── CalendarHeader.tsx   # 月/年导航
│   │   ├── CalendarCell.tsx     # 单日格子（最多6行事项 + Checkbox）
│   │   ├── MonthView.tsx        # 月日历网格
│   │   ├── BlockCard.tsx        # 区块卡片（每项有 Checkbox 可勾选）
│   │   └── AIInputBar.tsx       # AI 快速输入 + 主面板/AI聊天入口按钮
│   ├── panel/
│   │   ├── PanelWindow.tsx      # 主面板根组件 + 跨窗口监听
│   │   ├── BlockSidebar.tsx     # 区块列表（新建/删除/显示隐藏）
│   │   ├── BlockCardGrid.tsx    # 总览卡片网格
│   │   ├── BlockDetailArea.tsx  # 事项 CRUD 详情区
│   │   └── SettingsPage.tsx     # 设置页
│   └── aichat/
│       └── AIChatWindow.tsx     # AI 聊天（完整对话界面）
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json           # 窗口配置
    ├── capabilities/default.json # 权限
    └── src/
        ├── main.rs
        ├── lib.rs                # setup + 命令注册 + desktop_pin + notify_all
        ├── db.rs                 # SQLite + 默认数据
        ├── models.rs             # Rust 结构体
        └── commands/
            ├── mod.rs
            ├── ai.rs             # ai_parse + ai_chat
            ├── blocks.rs         # 区块 CRUD
            ├── items.rs          # 事项 CRUD + 日历月数据 + 自动顺延
            ├── completions.rs    # 完成/取消完成
            └── settings.rs       # KV 配置
```

完整 PRD: `F:\idea\todo\ai-todo\PRD.md`

---

## 当前完成/待办清单

### ✅ 已完成

- [x] Rust 后端全部 21 个 IPC 命令 + SQLite 数据层
- [x] TypeScript 类型 + 4 个 Zustand store
- [x] 主题系统（3 主题 × 2 模式），ThemeProvider 接受 primaryColor prop
- [x] Widget 窗口左右布局（左60%日历 + 右40%区块列表）
- [x] 主面板全部组件（侧栏、总览卡片、详情 CRUD、设置）
- [x] shadcn/ui 全面集成，neutral base 色板
- [x] AI 输入 → `ai_parse` 后端 → 自动匹配区块创建事项
- [x] 日历格子展示事项 + Checkbox 勾选/取消完成
- [x] **Alt+Space 全局热键**（Windows 桌面固定 + 3秒延迟恢复）
- [x] **AI 聊天窗口**（完整对话界面，支持上下文）
- [x] **跨窗口实时同步**（通过 Rust `notify_all` 广播事件）
- [x] 区块显示/隐藏实时同步
- [x] 设置（透明度/颜色）实时更新悬浮窗
- [x] 日历每格显示 6 行待办
- [x] 周视图切换按钮已移除（仅月视图）

### 🟡 P1 — 重要功能

- [ ] **自动顺延** — 后端 `run_auto_rollover` 已实现，前端未调用（应在应用启动时或每日首次打开时触发）
- [ ] **deadline 前 3 天脉冲动画** — 日历格子和事项列表已有红色边框，缺脉冲动画

### 🟢 P2 — 增强

- [ ] **SVG 图标系统** — 3 套主题化 SVG 图标集，替换 lucide-react
- [ ] 应用图标 + 打包签名

### 🐛 已知问题

- 跨窗口事件通过 Rust `notify_all` 命令工作，但 `app.emit()` 在某些 Tauri 2 版本中可能只在当前窗口接收——如果出现不同步，需改为 `app.get_webview_window(label)?.emit()` 逐个窗口广播

---

## 关键实现细节

### 跨窗口同步机制

```
panel 更新区块/事项 → store → emitDataChanged()
  → invoke('notify_all', { channel: 'app://data-changed' })
  → Rust app.emit() → 所有 WebView 收到事件
  → WidgetWindow/PanelWindow 监听到 → fetchBlocks() + fetchCalendarMonth()
```

### 桌面固定机制

```rust
desktop_pin::pin_to_desktop(hwnd)   // 启动时：设为 WorkerW 子窗口
desktop_pin::bring_to_front(hwnd)   // Alt+Space：解绑 → 置顶 → 3s后重绑
```

### 完成/取消完成逻辑

1. `complete_item` → 记录 `completion_records`（含 `original_block_id`）→ 移入"已完成"区块
2. `uncomplete_item` → 删除对应记录 → 无剩余记录则恢复原区块
3. 一条 item 可在不同日期多次完成/取消

### 日历数据流

1. `get_calendar_month(year, month)` → 返回 `CalendarMonthData`
2. 数据含 padding 日、is_today 标记、每个日期的 `ItemWithCompletion[]`
3. 日历格子点击 → `complete_item`/`uncomplete_item` → 自动刷新

### AI 解析数据流

1. 用户输入自然语言 → `invoke('ai_parse', { text })`
2. Rust 端调用配置的 LLM API（兼容 OpenAI 格式）
3. 返回 `Vec<AiParseResult>` → 前端匹配已有区块（不自动创建）→ `create_item`
4. 匹配优先级：精确名称 → 模糊包含 → 回退"待办" → 回退 `blocks[0]`

### Rust IPC 命令完整索引

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `open_panel_window` | — | `()` | 打开主面板窗口 |
| `open_aichat_window` | — | `()` | 打开AI聊天窗口 |
| `notify_all` | channel | `()` | 广播事件到所有窗口 |
| `get_blocks` | — | `Vec<Block>` | 所有区块 |
| `create_block` | name, icon, color | `Block` | 新建区块 |
| `update_block` | id, name?, icon?, color?, show_on_desktop? | `Block` | 更新区块 |
| `delete_block` | id | `()` | 删除区块 |
| `get_items` | block_id? | `Vec<Item>` | 按区块或全部 |
| `get_items_by_date` | date | `Vec<Item>` | 某日期的项 |
| `get_calendar_month` | year, month | `CalendarMonthData` | 整月日历数据 |
| `create_item` | CreateItemInput | `Item` | 新建事项 |
| `update_item` | UpdateItemInput | `Item` | 更新事项 |
| `delete_item` | id | `()` | 删除事项 |
| `complete_item` | item_id, date | `CompletionRecord` | 标记完成 |
| `uncomplete_item` | item_id, date | `()` | 取消完成 |
| `get_completions` | item_id? | `Vec<CompletionRecord>` | 完成记录 |
| `run_auto_rollover` | — | `Vec<Item>` | 自动顺延 |
| `ai_parse` | text | `Vec<AiParseResult>` | AI 解析 |
| `ai_chat` | messages | `String` | AI 对话 |
| `get_setting` | key | `Option<String>` | 获取设置 |
| `set_setting` | key, value | `()` | 设置值 |
| `get_all_settings` | — | `Vec<(String, String)>` | 所有设置 |

---

## 设计语言快速参考

- **主色**：由 `widget_primary_color` / `panel_primary_color` 动态控制，通过 `ThemeProvider primaryColor` prop 传入
- **字号层级**：标题 `text-sm`(14px) / 正文 `text-xs`(12px) / 辅助 `text-[10px]`(10px)
- **间距**：内容区 `p-4`，卡片间 `gap-3`，顶栏 `h-11`，侧栏 `w-52`
- **圆角**：`rounded-md`（6px）通用，`rounded-lg`（8px）卡片
- **卡片**：使用 shadcn `Card` + `CardHeader` + `CardContent` 标准结构
- **所有组件**：只用 shadcn 语义类，**禁止**自定义 hex 色或 `var(--app-*)`
- **Widget 透明度**：通过根 div 的 `style={{ opacity: config.widget_opacity }}`
