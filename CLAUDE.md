# Doodle（嘟豆）— AI 智能待办清单

## 项目概述

Windows 11 桌面应用，以半透明悬浮窗口形式在桌面展示日历和自定义区块，集成 AI 能力实现自然语言输入自动解析为结构化待办事项。

架构：`Tauri 2.0 + Rust 后端 + React/TypeScript 前端`

项目路径：`F:\idea\todo\ai-todo`

---

## 产品需求

### 窗口系统

| 窗口 | 说明 |
|------|------|
| **Widget 悬浮桌面** | 半透明、始终置顶、无边框、可拖动。展示日历 + 自定义区块 + AI 输入栏 |
| **主面板** | 普通窗口，点击底部按钮打开。管理所有区块、编辑事项、配置设置 |
| **AI 聊天** | 点击输入框展开为对话模式（暂未实现） |

### 日历
- 月视图为主，可翻上/下月，可切换到周视图
- 所有**有关联日期**的待办都在日历上显示
- deadline 前 3 天 → 醒目样式（红色边框 + 脉冲动画）
- 完成打勾 → 保留显示为已完成状态，不消失
- 未完成 → 自动顺延到下一天继续显示

### 区块系统
- 自定义可拖拽排列的区块（react-grid-layout），可调整大小
- 初始默认区块：**待办**、**已完成**、**灵感**
- 可新增自定义区块（购物清单、视频选题等）
- 区块可在桌面显示/隐藏（主面板中控制）
- 颜色规则：
  - 灵感和待办用不同色标识
  - 待办按紧急重要程度分色（四象限）
  - deadline 临近自动变醒目

### AI 输入
- 混合模式：默认快速输入栏（自然语言→自动解析），可展开为对话模式
- 用户自带 API Key（配置字段：`ai_api_key`, `ai_endpoint`, `ai_model`）
- 解析示例：输入"6.30 买眼线笔，比较急" → 自动创建到购物清单区块，设日期 6.30，优先级紧急
- 无日期时 AI 根据当前任务密度自动排期

### 主题系统
- 三套预设主题：**卡通 (Cartoon)**、**像素风 (Pixel)**、**商务科技 (Tech)**
- 每套主题支持 **Light / Dark** 两种明暗模式
- 悬浮桌面和主面板可分别设置主色调
- 悬浮桌面可独立调整透明度 (10%-90%)
- 所有图标为**自绘 SVG 组件**（不用 emoji），每套主题独立图标集

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面框架 | Tauri 2.0 | 后端 Rust + WebView2 |
| 前端框架 | React 18 + TypeScript | - |
| 样式 | Tailwind CSS v4 | 原子化 CSS |
| 状态管理 | Zustand | 轻量 |
| 区块布局 | react-grid-layout | 拖拽 + 调整大小 |
| 后端 | Rust | - |
| 数据库 | SQLite (rusqlite) | 单文件 |
| AI 调用 | reqwest (Rust) | LLM API 调用 |
| 全局热键 | tauri-plugin-global-shortcut | Alt+Space |
| 窗口管理 | @tauri-apps/api | 多窗口 |

### 关键依赖

**前端** (`package.json`):
- `react`, `react-dom` (18.x)
- `@tauri-apps/api` (2.x)
- `zustand`
- `react-grid-layout`, `@types/react-grid-layout`
- `tailwindcss`, `@tailwindcss/vite`

**后端** (`Cargo.toml`):
- `tauri` (2.x), `tauri-plugin-opener`, `tauri-plugin-global-shortcut`, `tauri-plugin-shell`
- `rusqlite` (0.40.1, features: bundled)
- `serde`, `serde_json` (with derive)
- `reqwest` (0.13.4, features: json)
- `chrono` (0.4.45, features: serde)
- `uuid` (1.23.4, features: v4)
- `tokio` (1.52.3, features: full)

---

## 项目文件结构

```
F:\idea\todo\ai-todo\
├── index.html
├── package.json
├── vite.config.ts
├── src/
│   ├── main.tsx                  # 入口
│   ├── index.css                 # Tailwind 导入
│   ├── App.tsx                   # 窗口路由 (widget/panel/aichat)
│   │
│   ├── types/index.ts            # TS 接口定义
│   │
│   ├── store/
│   │   ├── useBlocksStore.ts     # 区块 CRUD
│   │   ├── useItemsStore.ts      # 事项 CRUD + 日历
│   │   ├── useSettingsStore.ts   # 主题 + 配置
│   │   └── useAIStore.ts         # AI 聊天
│   │
│   ├── components/
│   │   ├── theme/
│   │   │   ├── themeConfig.ts    # 主题色板 + 优先权颜色
│   │   │   └── ThemeProvider.tsx  # CSS 变量注入
│   │   ├── ui/
│   │   │   └── GlassPanel.tsx    # 玻璃态容器
│   │   ├── widget/               # 悬浮桌面窗口
│   │   │   ├── WidgetWindow.tsx
│   │   │   ├── CalendarHeader.tsx
│   │   │   ├── CalendarCell.tsx
│   │   │   ├── MonthView.tsx
│   │   │   ├── BlockCard.tsx
│   │   │   └── AIInputBar.tsx
│   │   ├── panel/
│   │   │   └── PanelWindow.tsx   # 主面板(开发中)
│   │   └── aichat/
│   │       └── AIChatWindow.tsx  # AI 聊天(开发中)
│   │
│   └── hooks/
│       └── (暂无)
│
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json           # 窗口配置
    ├── capabilities/default.json # 权限配置
    └── src/
        ├── main.rs
        ├── lib.rs                # Tauri setup + 命令注册
        ├── db.rs                 # SQLite 初始化
        ├── models.rs             # Serde 结构体
        └── commands/
            ├── mod.rs
            ├── blocks.rs         # 区块 CRUD
            ├── items.rs          # 事项 CRUD + 日历 + 顺延
            ├── completions.rs    # 完成记录
            └── settings.rs       # 配置读写
```

---

## Rust IPC 命令索引

所有命令通过 `#[tauri::command]` 暴露，前端用 `invoke()` 调用。

| 命令 | 参数 | 返回 | 说明 |
|------|------|------|------|
| `open_panel_window` | — | `()` | 打开主面板窗口 |
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
| `run_auto_rollover` | — | `Vec<Item>` | 执行自动顺延逻辑 |
| `get_setting` | key | `Option<String>` | 获取设置 |
| `set_setting` | key, value | `()` | 设置值 |
| `get_all_settings` | — | `Vec<(String, String)>` | 所有设置 |

### 数据模型

```rust
Block {
    id: String,           // UUID
    name: String,         // 区块名 "待办"
    icon: String,         // 图标名
    color: String,        // 主色 "#6366f1"
    sort_order: i32,
    show_on_desktop: bool,
    created_at: String,
}

Item {
    id: String,
    block_id: String,
    content: String,          // 内容
    item_type: String,        // 'todo' | 'idea' | 'progress' | 'custom'
    priority: String,         // 'urgent_important' | 'important_not_urgent'
                              // | 'urgent_not_important' | 'neither'
    status: String,           // 'active' | 'completed' | 'cancelled'
    due_date: Option<String>, // ISO "2026-06-30"
    start_date: Option<String>,
    is_date_linked: bool,
    completed_at: Option<String>,
    created_at: String,
    updated_at: String,
}

CompletionRecord {
    id: String,
    item_id: String,
    completed_date: String, // "2026-06-14"
    completed_at: String,
}

AiParseResult {
    content: String,
    date: Option<String>,
    item_type: String,
    priority: String,
    block_name: String,
    reason: Option<String>,
}

CalendarMonthData {
    year: i32,
    month: u32,
    days: Vec<CalendarDay>,  // 包含 padding 的整月网格
}

CalendarDay {
    date: String,
    day_of_month: u32,
    is_current_month: bool,
    is_today: bool,
    items: Vec<ItemWithCompletion>,
}

ItemWithCompletion {
    item: Item,
    completed_on_this_date: bool,
}
```

### SQLite 表结构

```sql
blocks (id, name, icon, color, sort_order, show_on_desktop, created_at)
items (id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, completed_at, created_at, updated_at)
completion_records (id, item_id, completed_date, completed_at)
settings (key, value)  -- key-value 存储
```

默认 3 个区块：**待办** (indigo)、**已完成** (green)、**灵感** (amber)
默认设置：theme=tech, mode=dark, opacity=0.85

---

## 窗口配置 (`tauri.conf.json`)

```json
- widget: 480×700, 无边框, 透明, 置顶, 跳过任务栏
- panel: 800×600, 有边框, 默认隐藏, 居中
- aichat: (未配置, 待添加)
```

权限 (`capabilities/default.json`)：`widget`, `panel`, `aichat` 共用权限集。

---

## 开发环境

### 启动

```bash
cd F:\idea\todo\ai-todo
npm run tauri dev
```

### 调试

- `Ctrl+Shift+I` 打开 Chrome DevTools（悬浮和主面板窗口各独立）
- Rust 端 `eprintln!` 输出在 VS Code 终端
- DB 文件位置：`C:\Users\1\AppData\Roaming\com.doodle.app\doodle.db`

### 构建

```bash
cargo tauri build
# 输出: src-tauri/target/release/bundle/msi/ai-todo_0.1.0_x64.msi
```

---

## 当前进度

### 已完成 (Phase 1-2 核心)
- [x] Rust 后端全部 IPC 命令 + SQLite 数据层
- [x] TypeScript 类型 + 4 个 Zustand store
- [x] 主题系统（3 主题 × 2 模式 + CSS 变量）
- [x] GlassPanel 玻璃态组件
- [x] 日历月视图组件 + 翻月
- [x] 悬浮桌面窗口（半透明、无边框、置顶、可拖动）
- [x] BlockCard 区块卡片（列出区块内事项）
- [x] AIInputBar 快速输入 + 主面板按钮
- [x] react-grid-layout 拖拽排列区块
- [x] 主面板窗口（预注册 hidden，按需显示）
- [x] AIInputBar 调用 `ai_parse` 命令解析+创建事项

### 待实现

#### Phase 3: 多窗口 + 热键
- [ ] 全局热键 Alt+Space 聚焦输入框
- [ ] AI 聊天窗口创建 + 显示
- [ ] WeekView 周视图组件
- [ ] 窗口拖拽区域配置 (`data-tauri-drag-region`)

#### Phase 4: AI 集成
- [ ] Rust `ai.rs` + `commands/ai.rs` — LLM 调用模块
- [ ] 设置页面配置 API Key / Model / Endpoint
- [ ] AI 聊天窗口完整实现
- [ ] 无日期任务自动排期逻辑

#### Phase 5: 自动顺延 + 紧急标识
- [ ] 日历格子 deadline 前 3 天红色闪烁样式
- [ ] 完成打勾交互（CalendarCell 点击 ✓）
- [ ] 未完成项自动顺延逻辑已实现（`run_auto_rollover`），前端需触发

#### Phase 6: 主面板完整功能
- [ ] BlockSidebar（左侧区块列表 + 显示/隐藏切换）
- [ ] BlockDetailArea + ItemList（事项列表 CRUD）
- [ ] ItemEditor / BlockEditor 模态框
- [ ] SettingsPage（主题切换 + AI Key 配置 + 颜色/透明度设置）

#### Phase 7: SVG 图标系统 + 打包
- [ ] IconBase 组件 + 3 套主题 SVG 图标（cartoon/pixel/tech）
- [ ] 图标 registry（IconName → 主题化组件映射）
- [ ] 替换所有文字/emoji 图标
- [ ] 应用图标 + 打包签名

### 已知问题
- 周视图未实现，显示占位符
- AI 聊天窗口未建立（Rust 端还没写创建命令）
- react-grid-layout 的 `process is not defined` 警告已通过 vite `define` 修复
- `AiParseResult` 结构体定义了但 Rust 端 `ai_parse` 命令还未实现
- 面板窗口需要 `react-grid-layout` 的 CSS 已导入

---

## 后续实现注意事项

1. **AI 模块使用 async**：`reqwest` 调用需要 async 命令，注意 Tauri 2.0 中 async command 的注册方式
2. **窗口身份识别**：`getCurrentWindow().label` 在新创建窗口中可靠，也可以通过 `URLSearchParams("?window=panel")` 兜底
3. **透明度窗口**：`transparent: true` 要求窗口无边框 (`decorations: false`)，WebView2 需要设置背景透明
4. **自动顺延逻辑**：在 `get_calendar_month` 中已内置：检查 `completion_records` 判断某天是否已完成，未完成的即使 `due_date < today` 也会继续显示
5. **安全**：用户 API Key 存储在本地 SQLite，不加密（因为是本地应用），AI 调用在 Rust 端执行而非前端
