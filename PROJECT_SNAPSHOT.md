# Doodle（嘟豆）— AI 智能待办清单 · 完整项目快照

> 生成时间: 2026-06-29
> 项目路径: `F:\idea\todo\ai-todo`
> 架构: Tauri 2.0 + Rust 后端 + React/TypeScript 前端 (Vite + Tailwind CSS v4)

---

## 一、项目概述

Windows 11 桌面应用，以半透明悬浮窗口形式在桌面展示日历和自定义区块，集成 AI（兼容 OpenAI / DeepSeek）实现自然语言输入自动解析为结构化待办事项。

### 三个窗口

| 窗口 | 说明 |
|------|------|
| **Widget 悬浮桌面** | 480×700, 无边框, 透明, 置顶, 跳过任务栏。展示日历 + 自定义区块 + AI 输入栏 |
| **主面板** | 800×600, 有边框, 默认隐藏, 居中。管理区块、事项 CRUD、配置设置 |
| **AI 聊天** | 占位，待实现 |

### 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.0 + Rust 后端 + WebView2 |
| 前端 | React 19 + TypeScript 5.8 |
| 样式 | Tailwind CSS v4 + shadcn/ui（New York 风格） |
| 状态管理 | Zustand v5 |
| 区块布局 | react-grid-layout v2.2.3 |
| 数据库 | SQLite (rusqlite, bundled) |
| AI 调用 | reqwest (Rust) → OpenAI 兼容 API |
| 图标 | lucide-react |

---

## 二、项目文件结构

```
F:\idea\todo\ai-todo\
├── index.html
├── package.json
├── vite.config.ts                 # Vite + Tailwind + @/ alias
├── tsconfig.json                  # baseUrl + @/ paths alias
├── components.json                # shadcn/ui 配置
│
├── src/
│   ├── main.tsx                   # React 入口
│   ├── index.css                  # Tailwind + shadcn CSS vars + 自定义 CSS vars
│   ├── App.tsx                    # 窗口路由 (widget/panel/aichat)
│   ├── vite-env.d.ts
│   │
│   ├── lib/
│   │   └── utils.ts               # cn() 工具函数 (clsx + tailwind-merge)
│   │
│   ├── types/
│   │   └── index.ts               # 所有 TS 接口定义
│   │
│   ├── store/
│   │   ├── useBlocksStore.ts      # 区块 CRUD
│   │   ├── useItemsStore.ts       # 事项 CRUD + 日历 + 完成
│   │   ├── useSettingsStore.ts    # 主题 + AI 配置
│   │   └── useAIStore.ts          # AI 聊天状态
│   │
│   ├── components/
│   │   ├── theme/
│   │   │   ├── themeConfig.ts     # 3主题×2模式 色板 + 优先权颜色
│   │   │   └── ThemeProvider.tsx   # CSS 变量注入（含 shadcn 变量桥接）
│   │   │
│   │   ├── ui/                    # shadcn/ui 组件
│   │   │   ├── GlassPanel.tsx     # 玻璃态容器（widget 专用）
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   └── dialog.tsx
│   │   │
│   │   ├── widget/                # 悬浮桌面窗口组件
│   │   │   ├── WidgetWindow.tsx   # Widget 根组件（日历 + 区块网格 + AI输入）
│   │   │   ├── CalendarHeader.tsx # 月/年导航 + 周/月切换
│   │   │   ├── CalendarCell.tsx   # 单日格子（事项文字 + Checkbox 打勾）
│   │   │   ├── MonthView.tsx      # 月日历网格
│   │   │   ├── BlockCard.tsx      # 区块卡片（react-grid-layout 子项）
│   │   │   └── AIInputBar.tsx     # AI 快速输入栏 + 主面板按钮
│   │   │
│   │   ├── panel/                 # 主面板组件
│   │   │   ├── PanelWindow.tsx    # 主面板根组件（上导航 + 左侧栏 + 内容区）
│   │   │   ├── BlockSidebar.tsx   # 左侧区块列表（新建/删除/显示隐藏）
│   │   │   ├── BlockDetailArea.tsx# 事项 CRUD 详情区（添加/编辑/排序/完成）
│   │   │   └── SettingsPage.tsx   # 设置页（AI配置/主题/外观/优先级）
│   │   │
│   │   └── aichat/
│   │       └── AIChatWindow.tsx   # AI 聊天（占位）
│   │
│   └── (无 hooks 目录)
│
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json            # 窗口配置 + 构建配置
    ├── capabilities/default.json  # 权限配置
    └── src/
        ├── main.rs                # Windows 入口
        ├── lib.rs                 # Tauri setup + 命令注册
        ├── db.rs                  # SQLite 初始化 + 表结构
        ├── models.rs              # Serde 结构体
        └── commands/
            ├── mod.rs
            ├── ai.rs              # ai_parse (批量) + ai_chat
            ├── blocks.rs          # 区块 CRUD
            ├── items.rs           # 事项 CRUD + 日历月数据 + 自动顺延
            ├── completions.rs     # 完成/取消完成 + 移动到已完成区块
            └── settings.rs        # 配置 KV 读写
```

---

## 三、完整数据模型

### SQLite 表

```sql
blocks (id TEXT PK, name, icon, color, sort_order INT, show_on_desktop INT, created_at)
items (id TEXT PK, block_id FK, content, item_type, priority, status, due_date, start_date, is_date_linked INT, completed_at, created_at, updated_at)
completion_records (id TEXT PK, item_id FK, original_block_id TEXT, completed_date, completed_at)
settings (key PK, value)
```

### Rust 结构体 (models.rs)

```rust
Block {
    id: String, name: String, icon: String, color: String,
    sort_order: i32, show_on_desktop: bool, created_at: String,
}

Item {
    id: String, block_id: String, content: String,
    item_type: String,   // 'todo' | 'idea' | 'progress' | 'custom'
    priority: String,    // 'urgent_important' | 'important_not_urgent' | 'urgent_not_important' | 'neither'
    status: String,      // 'active' | 'completed' | 'cancelled'
    due_date: Option<String>, start_date: Option<String>,
    is_date_linked: bool, completed_at: Option<String>,
    created_at: String, updated_at: String,
}

CompletionRecord {
    id: String, item_id: String,
    original_block_id: String,  // 完成时记录原区块，取消完成时恢复
    completed_date: String,     // "2026-06-14"
    completed_at: String,
}

AiParseResult {
    content: String, date: Option<String>,
    item_type: String, priority: String,
    block_name: String, reason: Option<String>,
}

CalendarMonthData { year: i32, month: u32, days: Vec<CalendarDay> }
CalendarDay { date: String, day_of_month: u32, is_current_month: bool, is_today: bool, items: Vec<ItemWithCompletion> }
ItemWithCompletion { item: Item, completed_on_this_date: bool }
```

### 前端 TS 类型 (types/index.ts)

```typescript
Block, Item, Priority, CreateItemInput, UpdateItemInput,
CompletionRecord, CalendarDay, ItemWithCompletion, CalendarMonthData,
AiParseResult,
ThemeName = 'cartoon' | 'pixel' | 'tech',
ThemeMode = 'light' | 'dark',
ThemeConfig {
  theme, mode, widget_opacity, widget_primary_color, panel_primary_color,
  ai_api_key, ai_model, ai_endpoint,
}
IconName = 'add' | 'delete' | 'edit' | 'calendar' | 'todo' | 'idea' | 'completed' | 'settings' | ...
```

---

## 四、Rust IPC 命令索引

所有命令通过 `#[tauri::command]` 暴露，前端用 `invoke('命令名', {参数})` 调用。

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
| `create_item` | input: CreateItemInput | `Item` | 新建事项 |
| `update_item` | input: UpdateItemInput | `Item` | 更新事项 |
| `delete_item` | id | `()` | 删除事项 |
| `complete_item` | item_id, date | `CompletionRecord` | 标记完成（移入已完成区块） |
| `uncomplete_item` | item_id, date | `()` | 取消完成（恢复原区块） |
| `get_completions` | item_id? | `Vec<CompletionRecord>` | 完成记录 |
| `run_auto_rollover` | — | `Vec<Item>` | 执行自动顺延逻辑(未完成过期待办) |
| `ai_parse` | text | `Vec<AiParseResult>` | LLM 解析自然语言为结构化待办(批量) |
| `ai_chat` | messages | `String` | AI 对话 |
| `get_setting` | key | `Option<String>` | 获取设置 |
| `set_setting` | key, value | `()` | 设置值 |
| `get_all_settings` | — | `Vec<(String, String)>` | 所有设置 |

### 关键 Rust 实现细节

**complete_item 逻辑:**
1. 查询 item 当前 `block_id`（记为 `original_block_id`）
2. 查找「已完成」区块的 ID
3. 插入 `completion_records`（含 `original_block_id`）
4. 将 item 的 `block_id` 改为已完成区块，`status` 改为 `'completed'`

**uncomplete_item 逻辑:**
1. 从 `completion_records` 读取 `original_block_id`
2. 删除匹配的记录
3. 如果没有剩余完成记录：恢复 item 的 `block_id` 为 `original_block_id`，`status` 改为 `'active'`

**ai_parse (OpenAI 兼容格式):**
- 自动补全 URL：`https://api.deepseek.com` → 自动加 `/chat/completions`
- 请求体：`{ model, max_tokens, messages: [{role:"system", content}, {role:"user", content}] }`
- 请求头：`Authorization: Bearer {api_key}`
- 响应解析：`body["choices"][0]["message"]["content"]` → JSON 解析为 `Vec<AiParseResult>`
- 兼容单对象返回（自动包装为数组）
- 兼容代码块 fence 包裹的 JSON

**get_calendar_month:**
- 查询当月所有 `is_date_linked=1` 的 items（含已完成）
- LEFT JOIN `completion_records` 标记 `completed_on_this_date`
- 自动填充前后月份的 padding 日
- `is_today` 用 `chrono::Local::now()` 判断

---

## 五、前端 Store 结构 (Zustand)

### useBlocksStore
```
blocks: Block[], loading: boolean
fetchBlocks(), createBlock(name, icon, color), updateBlock(id, updates), deleteBlock(id)
```

### useItemsStore
```
items: Item[], completions: CompletionRecord[], calendarData: CalendarMonthData | null, loading: boolean
fetchItems(blockId?), fetchCalendarMonth(year, month), createItem(input), updateItem(input), deleteItem(id),
completeItem(itemId, date), uncompleteItem(itemId, date)
```
注意：`completeItem` 和 `uncompleteItem` 会自动刷新 `calendarData`（如果非空）。

### useSettingsStore
```
config: ThemeConfig, loading: boolean
fetchSettings(), setSetting(key, value), setTheme(), setMode(), setWidgetOpacity(), setWidgetColor(), setPanelColor(), setAiKey()
```

### useAIStore
```
messages: {role, content}[], loading: boolean
addMessage(), aiParse(text), aiChat(text), clearMessages()
```

---

## 六、主题系统

### 三套主题 × 两套模式

| 主题 | 字体 | 圆角 | 默认色调 |
|------|------|------|---------|
| tech (商务科技) | Inter / SF Pro | 8px | indigo (#6366f1) |
| cartoon (卡通) | Comic Sans MS / Chalkboard | 16px | orange (#f97316) |
| pixel (像素风) | Press Start 2P / VT323 | 0px | green (#22c55e) |

### CSS 变量体系

ThemeProvider 同时设置两套变量：

**自定义 `--app-*` 变量**（给 GlassPanel 和 widget 组件用）：
```
--app-bg, --app-bg-alt, --app-text, --app-text-secondary,
--app-border, --app-accent, --app-glass-bg, --app-glass-border,
--app-font, --app-radius, --icon-stroke, --widget-opacity
```

**shadcn `--*` 变量**（给 shadcn/ui 组件用）：
```
--background, --foreground, --card, --card-foreground, --primary, --primary-foreground,
--secondary, --secondary-foreground, --muted, --muted-foreground, --border, --input, --ring
```

桥接方式：ThemeProvider 用 `hexToHsl()` 将主题色板中的 hex 色转为 HSL 字符串，注入 shadcn 变量。同时根据 `config.mode` 在 `<html>` 上添加/移除 `dark` class。

### 优先级颜色 (themeConfig.ts)

| 优先级 | 颜色 | 标签 |
|--------|------|------|
| `urgent_important` | #ef4444 (red) | 紧急重要 |
| `important_not_urgent` | #f59e0b (amber) | 重要不紧急 |
| `urgent_not_important` | #f97316 (orange) | 紧急不重要 |
| `neither` | #6b7280 (gray) | 一般 |

---

## 七、当前进度

### Phase 1-3 已完成
- [x] Rust 后端全部 IPC 命令 + SQLite 数据层
- [x] TypeScript 类型 + 4 个 Zustand store
- [x] 主题系统（3 主题 × 2 模式 + CSS 变量桥接 shadcn）
- [x] 日历月视图组件 + 翻月
- [x] 悬浮桌面窗口（半透明、无边框、置顶、可拖动 + react-grid-layout）
- [x] AIInputBar 快速输入 + 主面板按钮
- [x] AI 解析后端（OpenAI 兼容，支持批量输入）
- [x] 日历格子展示事项文字 + Checkbox 打勾/取消
- [x] 完成时移动事项到「已完成」区块 + 可取消完成恢复原区块
- [x] 创建事项后实时刷新日历
- [x] 主面板完整功能（区块侧边栏 CRUD + 事项详情 CRUD + 设置页面）
- [x] shadcn/ui 集成（Button/Card/Input/Checkbox/Badge/Select/Separator/Dialog）
- [x] AI 批量输入（一次性解析多条事项）

### 待实现

| 优先级 | 模块 | 说明 |
|--------|------|------|
| 中 | WeekView 周视图 | CalendarHeader 已有切换按钮，展示占位符 |
| 中 | 全局热键 Alt+Space | tauri-plugin-global-shortcut 已安装，未注册 |
| 中 | deadline 前 3 天红色闪烁 | 已有紧急边框样式，缺脉冲动画 |
| 中 | AI 聊天窗口 | AIChatWindow 占位 + ai_chat 后端已实现 |
| 中 | 自动顺延触发 | run_auto_rollover 已实现，前端未调用 |
| 低 | SVG 图标系统 | 3 套主题 SVG 图标集（Phase 7） |
| 低 | 主面板设置页改进 | Select 下拉组件替换按钮组 |

### 已知问题

- 周视图未实现
- AI 聊天窗口未完成
- react-grid-layout 的 `process is not defined` 警告已通过 vite `define` 修复
- 默认 3 个区块不可删除
- `noUnusedLocals: true` 严格模式，引入未使用的 import 会报错

---

## 八、UI 框架说明

### shadcn/ui 组件 (src/components/ui/)
- 使用 `@/` 路径别名导入
- 样式通过 Tailwind CSS 变量驱动，由 ThemeProvider 动态注入
- `cn()` 工具函数在 `src/lib/utils.ts`
- 组件列表：Button, Card (CardHeader/CardTitle/CardContent/CardFooter), Input, Checkbox, Badge, Select (全套), Separator, Dialog (全套)

### GlassPanel (src/components/ui/GlassPanel.tsx)
- Widget 窗口专用玻璃态容器
- `backdrop-blur-xl` + `--app-glass-bg` + `--app-glass-border`
- 不用于主面板

### 窗口路由 (App.tsx)
根据 `getCurrentWindow().label` 或 URL 参数 `?window=` 分发：
- `widget` → WidgetWindow
- `panel` → PanelWindow
- `aichat` → AIChatWindow

---

## 九、关键配置

### tauri.conf.json 窗口配置
```json
widget: { width: 480, height: 700, decorations: false, transparent: true, alwaysOnTop: true, skipTaskbar: true }
panel:  { width: 800, height: 600, decorations: true, visible: false, center: true }
```

### vite.config.ts
- 插件: `react()`, `tailwindcss()`
- `@/` 路径别名: `path.resolve(__dirname, "./src")`
- 端口 1420, HMR 1421

### capabilities/default.json
所有窗口共用权限，含 `core:default`, `core:window:*`, `global-shortcut:default`, `opener:default`, `shell:default`

### 开发环境
```bash
cd F:\idea\todo\ai-todo
npm run tauri dev
# 调试: Ctrl+Shift+I 打开 DevTools
# DB: C:\Users\1\AppData\Roaming\com.doodle.app\doodle.db
```

### 默认设置
- theme=tech, mode=dark, widget_opacity=0.85
- ai_endpoint=https://api.deepseek.com, ai_model=deepseek-chat
- 3 个默认区块：待办(indigo) / 已完成(green) / 灵感(amber)

---

## 十、当前代码关键文件速查

| 文件 | 行数 | 说明 |
|------|------|------|
| `src-tauri/src/commands/ai.rs` | ~155 | AI 调用，需关注 `ensure_chat_url` 和 `AiParseResult` 解析 |
| `src-tauri/src/commands/completions.rs` | ~120 | 完成/取消完成核心逻辑，含 `original_block_id` 字段 |
| `src-tauri/src/commands/items.rs` | ~300 | 含 `get_calendar_month` 核心日历查询 |
| `src-tauri/src/db.rs` | ~107 | 表结构定义 + 默认数据插入 |
| `src/components/theme/ThemeProvider.tsx` | ~75 | CSS 变量注入 + shadcn 桥接 + dark class 切换 |
| `src/components/widget/WidgetWindow.tsx` | ~110 | Widget 根组件，整合日历+区块+AI输入 |
| `src/components/widget/CalendarCell.tsx` | ~65 | 日历格子，含 Checkbox 完成交互 |
| `src/components/panel/BlockDetailArea.tsx` | ~150 | 事项 CRUD 主实现 |
| `src/components/panel/SettingsPage.tsx` | ~130 | 设置页面（AI配置+主题+外观） |
| `src/index.css` | ~100 | Tailwind + shadcn CSS vars + 自定义 vars |

---

> 此文档为完整的项目状态快照，导入新会话后可直接读取并继续进行后续开发。
