# Doodle（嘟豆）— AI 智能待办清单 · 产品需求文档

> 版本: v0.1 | 更新: 2026-06-29

---

## 一、产品概述

**Doodle（嘟豆）** 是一款 Windows 11 桌面应用，以半透明悬浮窗口形式在桌面展示日历和自定义区块，集成 AI 实现自然语言输入自动解析为结构化待办事项。

### 产品定位

- 桌面侧边待办工具，始终可见、快速记录
- AI 驱动的自然语言解析，降低输入成本
- 自定义区块系统，灵活组织各类事项

### 核心价值

1. **快速捕获** — Alt+Space 拉起输入，自然语言秒级转待办
2. **始终可见** — 悬浮窗口置顶显示，不打断工作流
3. **灵活组织** — 自定义区块 + 四象限优先级 + 日期关联

---

## 二、技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Tailwind CSS v4 | 4.3 | 原子化 CSS |
| shadcn/ui | New York | 组件库（Button/Card/Input/Dialog/Popover 等） |
| Zustand | 5 | 状态管理 |
| react-grid-layout | 2.2 | 区块拖拽/调整大小 |
| lucide-react | 1.22 | 图标库 |
| @radix-ui/* | 各类 | 无头 UI 组件（Checkbox/Select/Tabs/Tooltip 等） |
| class-variance-authority | 0.7 | 组件变体管理 |
| tailwind-merge + clsx | — | className 合并(cn()) |

### 桌面框架

| 技术 | 用途 |
|------|------|
| Tauri 2.0 | 桌面容器 + WebView2 |
| tauri-plugin-opener | 外部链接打开 |
| tauri-plugin-global-shortcut | 全局热键 Alt+Space |
| tauri-plugin-shell | 命令行交互 |

### 后端 (Rust)

| 依赖 | 用途 |
|------|------|
| tauri 2.x | 桌面框架核心 |
| rusqlite 0.40 (bundled) | SQLite 数据库 |
| serde / serde_json | 序列化 |
| reqwest 0.13 | HTTP 客户端（AI API 调用） |
| chrono 0.45 | 日期时间处理 |
| uuid 1.23 | UUID 生成 |
| tokio 1.52 | 异步运行时 |

### 数据库

SQLite 单文件，位置: `C:\Users\%USER%\AppData\Roaming\com.doodle.app\doodle.db`

---

## 三、窗口系统

### 3.1 Widget 悬浮桌面窗口

| 属性 | 值 |
|------|------|
| 尺寸 | 480 × 700 |
| 边框 | 无 (`decorations: false`) |
| 背景 | 透明 (`transparent: true`) |
| 置顶 | 是 (`alwaysOnTop: true`) |
| 任务栏 | 跳过 (`skipTaskbar: true`) |
| 透明度 | 可配置 (10%-90%)，通过 CSS opacity |

**布局（自上而下）：**

```
┌──────────────────────────────────────────────┐
│  ← 2026年 六月 →              [周/月]        │  ← CalendarHeader
│  一  二  三  四  五  六  日                   │
│  [日历格子网格 7列]                          │  ← MonthView / CalendarCell
│  28  29  30                                   │
├──────────────────┬───────────────────────────┤
│  日历 (缩小版)   │  [区块卡片]               │  ← react-grid-layout
│                  │  [区块卡片]               │     BlockCard
├──────────────────┴───────────────────────────┤
│  ✨ [输入框... (Alt+Space)]  记录  主面板    │  ← AIInputBar
└──────────────────────────────────────────────┘
```

**交互要点：**
- 日历月份标题区域可拖拽窗口（`data-tauri-drag-region`）
- 区块卡片通过 `.drag-handle` 拖拽重排，右下角可调整尺寸
- AI 输入栏固定在底部

### 3.2 主面板窗口

| 属性 | 值 |
|------|------|
| 尺寸 | 800 × 600 |
| 边框 | 有 (`decorations: true`) |
| 初始 | 隐藏 (`visible: false`)，居中对齐 |
| 打开 | 调用 `invoke('open_panel_window')` |

**布局（三栏式）：**

```
┌──────────────────────────────────────────────────────────────┐
│  🖊 嘟豆 v0.1                      区块 ███  设置 ███      │  ← 顶栏 Header
├──────────┬───────────────────────────────────────────────────┤
│ 区块     │  ┌─────────────┐  ┌─────────────┐                │
│ ○ 待办   │  │ 📋 待办     │  │ ✅ 已完成   │                │  ← 总览模式
│ ○ 已完成 │  │ 事项列表    │  │ 事项列表    │                │     BlockCardGrid
│ ○ 灵感   │  └─────────────┘  └─────────────┘                │
│ ─────── │                                                   │
│ + 新建   │  ———— 或 ————                                    │
│          │  ← 返回  ● 待办  [3/5]                           │  ← 详情模式
│          │  [输入框 + 添加]                                 │     BlockDetailArea
│          │  ☐ 🟠 事项1  [≡] [✕]                           │
│          │  ▶ 已完成 · 2                                    │
└──────────┴───────────────────────────────────────────────────┘
```

**交互要点：**
- 顶部 Tabs 切换 "区块" 和 "设置"
- 左侧侧边栏点击区块进入详情，再次点击或者顶部返回回到总览
- 总览模式：卡片网格 view
- 详情模式：完整 CRUD + 已完成折叠面板

### 3.3 AI 聊天窗口（占位）

| 属性 | 值 |
|------|------|
| 当前状态 | 占位，所有交互禁用 |
| 计划 | 展开式对话界面，上下文关联，可引用待办 |

---

## 四、日历系统

### 4.1 月视图

**布局：**
- 7 列网格（周一起始）
- 每个日期占一个 `aspect-square` 格子
- 每天最多显示 3 条事项，超出显示 "+N"

**数据来源：**
- `get_calendar_month(year, month)` — 返回整月数据（含 padding 日）
- 仅显示 `is_date_linked = true` 的项
- LEFT JOIN completion_records 标记完成状态

**视觉状态：**

| 状态 | 样式 |
|------|------|
| 当前月 | 正常不透明度 |
| 前后月填充日 | `opacity-20` |
| 今天 | `bg-accent/15` + `border-accent/30` |
| 紧急事项(urgent_important 未完成) | `border-destructive/40` + 红色微光 |
| 已完成事项 | 删除线 + 低透明度 |

**交互：**
- 上月/下月：左右按钮点击
- 月份标题：显示 "2026年 6月" 格式
- 视图切换：月 ↔ 周（周视图未实现）
- 事项行点击：切换完成状态（调用 `complete_item` / `uncomplete_item`）

### 4.2 周视图（待实现）

占位状态，显示 "周视图 (Phase 3+)"。

### 4.3 自动顺延

**后端逻辑** (`run_auto_rollover`)：
- 查询所有 `due_date < today` 且 `status = 'active'` 的项
- 将其 `due_date` 更新为今天
- 返回更新的项列表

**前端触发**：应用启动时或每日首次打开时自动调用。

### 4.4 紧急标识

deadline 前 3 天：
- 红色边框 (`border-destructive/40`)
- 微弱红色阴影 (`shadow-[0_0_4px_rgba(239,68,68,0.15)]`)
- 日历格子和事项列表中均体现

---

## 五、区块系统

### 5.1 默认区块

| 名称 | 颜色 | 用途 |
|------|------|------|
| 待办 | indigo (#6366f1) | 活跃待办事项 |
| 已完成 | green (#22c55e) | 已完成事项（自动移入） |
| 灵感 | amber (#f59e0b) | 灵感和想法 |

### 5.2 区块操作

| 操作 | 位置 | 说明 |
|------|------|------|
| 新建 | 主面板侧边栏底部 | 输入名称 → 自动创建（默认颜色 #6366f1） |
| 选中 | 主面板侧边栏 | 进入详情视图，该区块高亮 |
| 删除 | 主面板侧边栏（悬停显示） | 确认 Dialog，默认区块不可删 |
| 显示/隐藏 | 主面板侧边栏（悬停显示） | 控制 Widget 窗口可见性 |
| 拖拽排序 | Widget 窗口 | react-grid-layout 手柄拖拽 |
| 调整大小 | Widget 窗口 | 右下角拖拽手柄 |

### 5.3 区块 CRUD 详情视图

**布局：**

```
← 返回  ● 区块名称  [活跃数/总数]
[+ 添加事项]  — 点击展开输入卡片
─────────────────────────────
☐ 🟠 事项1           [≡] [✕]  ← ItemRow
☐ 🟡 事项2   06-30   [≡] [✕]
─────────────────────────────
▶ 已完成 · 2                   ← Collapsible
  ✓ 事项3（已删除线）
  ✓ 事项4
```

**ItemRow 交互：**
- **点击复选框** — 切换完成状态（移入/移出已完成区块）
- **双击文字** — 进入行内编辑模式（Input 替换）
- **优先级 Popover** — 四项选择（紧急重要/重要不紧急/紧急不重要/一般），选中项打勾
- **删除按钮** — 确认 Dialog 后删除

---

## 六、优先级系统

### 6.1 四象限

| 优先级 | 标签 | 颜色 | 色值 |
|--------|------|------|------|
| `urgent_important` | 紧急重要 | Red | #ef4444 |
| `important_not_urgent` | 重要不紧急 | Amber | #f59e0b |
| `urgent_not_important` | 紧急不重要 | Orange | #f97316 |
| `neither` | 一般 | Gray | #6b7280 |

### 6.2 视觉体现

- 事项行：颜色圆点指示优先级
- 日历格子：紧急事项红色边框
- 设置页：优先级颜色图例

---

## 七、AI 功能

### 7.1 AI 输入解析

**触发方式：** Widget 底部输入框输入文字 → 点击 "记录" 或 Enter

**后端调用：** `ai_parse(text: String) → Vec<AiParseResult>`

**请求配置：**
- Endpoint: 用户配置（默认 `https://api.deepseek.com`）
- Model: 用户配置（默认 `deepseek-chat`）
- API Key: 用户配置
- 自动追加 `/chat/completions`
- 兼容 OpenAI 格式

**解析结果：**

```json
[
  {
    "content": "买眼线笔",
    "date": "2026-06-30",
    "item_type": "todo",
    "priority": "urgent_important",
    "block_name": "购物清单",
    "reason": "用户标注'比较急'"
  }
]
```

**前端流程：**
1. 调用 `ai_parse` → 获取结构化结果列表
2. 对每个结果：自动查找或创建同名区块
3. 调用 `create_item` 创建事项
4. 刷新日历和区块列表

### 7.2 AI 聊天（待实现）

- 独立的聊天窗口
- 上下文关联待办列表
- 支持自然语言查询 / 修改 / 创建
- 后端 `ai_chat` 命令已实现

---

## 八、主题系统

### 8.1 三套主题

| 主题 | 圆角 | 字体 | 默认主色 |
|------|------|------|---------|
| tech（商务科技） | 8px | Inter / SF Pro | #6366f1 (indigo) |
| cartoon（卡通） | 16px | Comic Sans MS / Chalkboard | #f97316 (orange) |
| pixel（像素风） | 0px | Press Start 2P / VT323 | #22c55e (green) |

### 8.2 主题切换维度

| 维度 | 控制方式 |
|------|---------|
| 主题风格 | Select 下拉框（tech/cartoon/pixel） |
| 明暗模式 | 按钮切换（深色/浅色） |
| Widget 主色 | 颜色拾取器 |
| 面板主色 | 颜色拾取器 |
| Widget 透明度 | Slider（10%-90%） |

### 8.3 技术实现

- `ThemeProvider` 读取 `useSettingsStore.config`
- 动态设置 `--primary` 和 `--ring` CSS 变量
- 切换 `dark` class 控制明暗模式
- 采用 shadcn neutral base 色板，仅 `--primary` 由主题注入

---

## 九、设置页面

### 布局 (Cards 列表)

```
┌─ AI 配置 ─────────────────────────────────┐
│  API Key    [························]     │
│  模型       [deepseek-chat··········]      │
│  接口地址   [https://api.deepseek.com]     │
│  [保存 AI 配置]                            │
└────────────────────────────────────────────┘
┌─ 主题 ────────────────────────────────────┐
│  主题风格   [商务科技 ▼]                   │
│  明暗模式   [深色] [浅色]                  │
└────────────────────────────────────────────┘
┌─ 外观 ────────────────────────────────────┐
│  桌面透明度  [═════════●══════] 85%        │
│  桌面主色    [■] #6366f1                   │
│  面板主色    [■] #6366f1                   │
└────────────────────────────────────────────┘
┌─ 优先级颜色 ──────────────────────────────┐
│  ● 紧急重要      #ef4444                   │
│  ● 重要不紧急    #f59e0b                   │
│  ● 紧急不重要    #f97316                   │
│  ● 一般          #6b7280                   │
└────────────────────────────────────────────┘
┌─ 当前主题预览 ────────────────────────────┐
│  主题: tech / 模式: dark                   │
│  字体: Inter / 圆角: 8px / 描边: 1.5px    │
└────────────────────────────────────────────┘
```

**交互：**
- AI 配置需点击 "保存" 按钮持久化
- 其他配置实时保存（`setSetting` 即时调用）
- 保存成功/失败 → Toast 提示（2.5s 自动消失）

---

## 十、状态说明

### 10.1 事项状态

| 状态 | 说明 | 位置 |
|------|------|------|
| `active` | 活跃待办 | 主列表 + 日历 |
| `completed` | 已完成 | 已完成折叠面板 + 日历（删除线） |
| `cancelled` | 已取消 | 不显示 |

### 10.2 空状态

| 位置 | 内容 |
|------|------|
| 无区块时 | 居中 "还没有区块，在左侧栏新建一个" |
| 无活跃事项时 | 居中图标 + "暂无活跃事项" |
| 无已完成事项 | 隐藏已完成折叠面板 |
| Widget 无可见区块 | 居中 "没有可见区块，打开主面板添加" |
| 日历格子无事项 | 空白格子 |

---

## 十一、项目结构

```
F:\idea\todo\ai-todo\
├── index.html                    # 入口 HTML
├── package.json                  # 前端依赖
├── vite.config.ts                # Vite 配置（@/ alias, Tailwind）
├── tsconfig.json                 # TS 配置
├── components.json               # shadcn 配置
├── CLAUDE.md                     # 开发说明
├── PRD.md                        # ⬅ 本文档
│
├── src/
│   ├── main.tsx                  # React 入口
│   ├── index.css                 # Tailwind + shadcn CSS vars
│   ├── App.tsx                   # 窗口路由 (widget/panel/aichat)
│   │
│   ├── lib/
│   │   └── utils.ts              # cn() 工具函数
│   │
│   ├── types/
│   │   └── index.ts              # 所有 TS 接口定义
│   │
│   ├── store/
│   │   ├── useBlocksStore.ts     # 区块 CRUD
│   │   ├── useItemsStore.ts      # 事项 CRUD + 日历
│   │   ├── useSettingsStore.ts   # 主题 + AI 配置
│   │   └── useAIStore.ts         # AI 聊天状态
│   │
│   ├── components/
│   │   ├── theme/
│   │   │   ├── themeConfig.ts    # 3主题×2模式 色板 + 优先级颜色
│   │   │   └── ThemeProvider.tsx  # CSS 变量注入
│   │   │
│   │   ├── ui/                   # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── label.tsx
│   │   │   └── GlassPanel.tsx
│   │   │
│   │   ├── widget/               # Widget 窗口组件
│   │   │   ├── WidgetWindow.tsx  # 根组件（日历 + 区块网格 + AI输入）
│   │   │   ├── CalendarHeader.tsx# 月/年导航 + 周/月切换
│   │   │   ├── CalendarCell.tsx  # 单日格子（事项+Checkbox）
│   │   │   ├── MonthView.tsx     # 月日历网格
│   │   │   ├── BlockCard.tsx     # 区块卡片（拖拽子项）
│   │   │   └── AIInputBar.tsx    # AI 快速输入栏
│   │   │
│   │   ├── panel/                # 主面板组件
│   │   │   ├── PanelWindow.tsx   # 根组件（顶栏 + 侧边栏 + 内容区）
│   │   │   ├── BlockSidebar.tsx  # 左侧区块列表
│   │   │   ├── BlockCardGrid.tsx # 总览卡片网格
│   │   │   ├── BlockDetailArea.tsx # 事项 CRUD 详情区
│   │   │   └── SettingsPage.tsx  # 设置页
│   │   │
│   │   └── aichat/
│   │       └── AIChatWindow.tsx  # AI 聊天（占位）
│   │
│   └── hooks/                    # (暂无自定义 hooks)
│
└── src-tauri/
    ├── Cargo.toml                # Rust 依赖
    ├── tauri.conf.json           # 窗口配置
    ├── capabilities/default.json # 权限
    └── src/
        ├── main.rs               # Windows 入口
        ├── lib.rs                # Tauri setup + 命令注册
        ├── db.rs                 # SQLite 初始化 + 默认数据
        ├── models.rs             # Rust 结构体
        └── commands/
            ├── mod.rs
            ├── ai.rs             # ai_parse + ai_chat
            ├── blocks.rs         # 区块 CRUD
            ├── items.rs          # 事项 CRUD + 日历 + 顺延
            ├── completions.rs    # 完成/取消完成
            └── settings.rs       # 配置 KV 读写
```

---

## 十二、Rust IPC 命令完整索引

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
| `run_auto_rollover` | — | `Vec<Item>` | 自动顺延 |
| `ai_parse` | text | `Vec<AiParseResult>` | AI 解析 |
| `ai_chat` | messages | `String` | AI 对话 |
| `get_setting` | key | `Option<String>` | 获取设置 |
| `set_setting` | key, value | `()` | 设置值 |
| `get_all_settings` | — | `Vec<(String, String)>` | 所有设置 |

---

## 十三、待实现功能清单

### P0 - 核心体验

- [ ] **全局热键 Alt+Space** — 使用 `tauri-plugin-global-shortcut`，按 Alt+Space 聚焦 Widget AI 输入框（已安装依赖，未注册）

### P1 - 重要体验

- [ ] **AI 聊天窗口** — 独立的聊天窗口，实现完整对话界面
  - 后端 `ai_chat` 命令已实现
  - 需要：创建 aichat 窗口、WebSocket/SSE 流式响应、对话上下文管理
- [ ] **周视图 WeekView** — CalendarHeader 已有切换按钮
  - 显示当前周的 7 天，上下滑动翻周
  - 每天展示关联事项

### P2 - 增强功能

- [ ] **自动顺延触发** — 前端在应用启动或每日首次显示时调用 `run_auto_rollover`
- [ ] **deadline 前 3 天脉冲动画** — 日历格子和事项列表红色闪烁动画
- [ ] **SVG 图标系统** — 3 套主题化 SVG 图标集，替换 lucide-react 临时图标

### P3 - 细节打磨

- [ ] 应用图标 + 打包签名
- [ ] 动画统一（视图切换、卡片增加、事项完成）
- [ ] 多语言支持（i18n）

---

## 十四、数据模型

### SQLite 表结构

```sql
blocks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  show_on_desktop INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

items (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'neither',
  status TEXT NOT NULL DEFAULT 'active',
  due_date TEXT,
  start_date TEXT,
  is_date_linked INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

completion_records (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  original_block_id TEXT NOT NULL,
  completed_date TEXT NOT NULL,
  completed_at TEXT NOT NULL
);

settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 核心 TypeScript 类型

```typescript
Block {
  id: string; name: string; icon: string; color: string;
  sort_order: number; show_on_desktop: boolean; created_at: string;
}

Item {
  id: string; block_id: string; content: string;
  item_type: 'todo' | 'idea' | 'progress' | 'custom';
  priority: 'urgent_important' | 'important_not_urgent' | 'urgent_not_important' | 'neither';
  status: 'active' | 'completed' | 'cancelled';
  due_date: string | null; start_date: string | null;
  is_date_linked: boolean; completed_at: string | null;
  created_at: string; updated_at: string;
}

ThemeName = 'cartoon' | 'pixel' | 'tech';
ThemeMode = 'light' | 'dark';
```
