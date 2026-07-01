# Doodle（嘟豆）项目接力文档

> 本文件用于跨对话窗口接力开发。读取此文件即可了解项目全貌、当前进度和下一步工作。

---

## 快速启动

```bash
cd F:\idea\todo\ai-todo
npm run tauri dev          # 启动开发模式
npx tsc --noEmit           # 类型检查 (需全局安装 typescript)
npx vite build             # 前端构建
cargo check                # Rust 编译检查 (在 src-tauri 目录)
```

调试：`Ctrl+Shift+I` 打开 DevTools / Rust 输出在终端 / DB 在 `C:\Users\1\AppData\Roaming\com.doodle.app\doodle.db` / 开发端口 `http://localhost:1422`

---

## 项目概览

Windows 11 桌面待办应用，Tauri 2.0 + Rust + React 19 + TypeScript 5.8。

三个窗口：
| 窗口 | 尺寸 | 说明 |
|------|------|------|
| **Widget** | 1440×900 | 毛玻璃悬浮，固定在桌面背景，Alt+Space 唤出 |
| **主面板** | 800×600 | 完整管理界面，默认隐藏，点击"主面板"按钮打开 |
| **AI 聊天** | 500×600 | 默认隐藏，从 Widget 底部机器人图标打开 |

---

## 最近完成的全部工作

### 毛玻璃悬浮窗 + 原生 Acrylic
- Widget 外层改为 `backdrop-blur-2xl` 毛玻璃效果，配合两层 absolute 叠加（模糊层 + 色调层）
- `window.setEffects([Effect.Acrylic])` 启用 Windows 11 原生 Acrylic 模糊（fallback: Mica）
- **桌面主色** (`widget_primary_color`) 作为毛玻璃的背景色调（`hexToRgba(tintColor, bgAlpha)`）
- **桌面透明度 slider 0.1→0.9** 映射到背景 alpha 0.85→0.15：值越大桌面壁纸越透
- 权限：`capabilities/default.json` 新增 `core:window:allow-set-effects`

### 字体大小可调
- `ThemeConfig` 新增 `widget_font_size: number`（默认 11px，范围 9-18px）
- `SettingsPage` 外观区新增字体大小 Slider
- `WidgetWindow` 外层 `style={{ fontSize }}` 设置基准字号，所有子组件删除硬编码 `text-[10px]` 等 Tailwind 类，改为 `style={{ fontSize: '0.85em' }}` 等相对单位，全部继承容器字号

### 文字颜色可调
- `ThemeConfig` 新增 `widget_text_color: string`（默认空串=跟随主题色）
- `SettingsPage` 外观区新增"桌面文字色"颜色选择器
- `WidgetWindow` 外层 `style={{ color }}` 覆盖所有文字颜色

### 日历竖向自适应
- `MonthView` 改为 `h-full flex flex-col`，网格 `grid-cols-7 flex-1 auto-rows-fr`
- `CalendarCell` `min-h-[85px]` → `min-h-0`，由 `auto-rows-fr` 自动均分垂直空间

### AI 日期解析修复
- Rust `ai_parse` prompt 动态注入**当前日期**和**明天日期**（`chrono::Local::now()`），AI 能准确计算"明天""后天"等相对日期

### AI 区块归类修复
- Rust prompt 注入用户已有区块名列表（`get_existing_block_names` 从 DB 读取）
- 前端 `getOrCreateBlock` 增强：精确匹配 → 大小写不敏感 → 部分包含 → 单字关键词 → 回退"待办"
- 示例：用户输入"买酱油"，即使 AI 返回 block_name=买东西，也能正确匹配到"购物清单"

### 主题颜色注入（Panel 主色/Widget 主色生效）⚠️ 已重构
- **旧实现**: `ThemeProvider` 注入全部 15 个 shadcn CSS 变量，覆盖所有 Doodle 主题色板
- **新实现**: `ThemeProvider` 仅注入 `--primary` / `--ring` / `--primary-foreground`（用户选择的 accent 色）。其余变量（`--background`, `--foreground`, `--card`, `--border`, `--muted`, `--accent`, `--secondary`, `--popover`, `--input` 等）回归 shadcn 默认 neutral 色板，由 `index.css` 的 `:root` / `.dark` 规则 + `dark` class 切换控制
- Panel 窗口使用 shadcn 标准默认样式（黑色/白色 neutral 主题）
- Widget 窗口 body 用 `<style>{`body { background: transparent !important; }`}</style>` 覆盖 shadcn 的 `bg-background`，保持毛玻璃透明背景

### GlassPanel 组件重构
- 改为 `rounded-xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl border border-white/20` 多层玻璃质感
- `BlockCard` 同步改为相同玻璃样式

### Alt+Space 全局热键
- `tauri-plugin-global-shortcut` 注册 `Alt+Space` → 显示并聚焦 Widget 窗口
- Rust `desktop_pin` 模块：`pin_to_desktop` 将 Widget 设为桌面子窗口（WorkerW）→ Win+D 不隐藏
- Alt+Space 时 `bring_to_front` 解除桌面绑定提到前台，3秒后自动恢复桌面固定
- 快捷键目前硬编码为 `Alt+Space`（`lib.rs` setup 中），后续通过设置页面动态配置

### AI 聊天窗口
- `AIChatWindow.tsx` 完整对话界面：消息气泡、自动滚动、加载动画、Enter 发送
- `useAIStore.ts` 用户消息立即显示、错误处理
- Widget 底部添加 AI 聊天入口按钮（机器人图标）

### 跨窗口实时联动
- `src/lib/events.ts` 事件总线：`emitDataChanged` / `emitSettingsChanged`
- Rust 命令 `notify_all` → `app.emit()` 广播到全部 WebView
- WidgetWindow 和 PanelWindow 各自监听 `onDataChanged` / `onSettingsChanged` 自动重刷

### 事项勾选修复
- `useItemsStore.fetchItems()` 改为无参数，永远拉取**全部**事项（`blockId: null`）
- 完成/取消完成操作后自动 `fetchItems()` + `emitDataChanged()`

### shadcn Checkbox 统一（日历 + 悬浮卡片 + 主面板详情）
- **CalendarCell**: 每个待办行用 shadcn `<Checkbox>`（`checked={isCompleted}`），颜色根据优先级/完成状态变化，onCheckedChange 触发 `complete_item`/`uncomplete_item`
- **BlockCard**: 同 shadcn `<Checkbox>`，显示活跃+已完成（最多8条），已完成项绿色+删除线
- **BlockDetailArea**: 活跃项和已完成区都统一用 shadcn `<Checkbox>`，已完成区勾选后恢复为活跃

### Markdown 实时同步
- **设置页**新增 "Markdown 文件路径"：Input 手动输入 + 「浏览」按钮（Rust `pick_md_file_path` → 原生保存对话框） + 「保存并同步」按钮
- **Rust 命令 `sync_to_markdown`**: 读取全部 blocks/items → 格式化为 Markdown → 原子写入（先写 .tmp 再 rename）
- **Rust 命令 `pick_md_file_path`**: `tauri-plugin-dialog` 原生文件保存对话框，过滤器 `*.md`
- **触发时机**: 所有 store 的 `createItem`/`updateItem`/`deleteItem`/`completeItem`/`uncompleteItem`/`createBlock`/`updateBlock`/`deleteBlock` 操作后自动调用 `invoke('sync_to_markdown')`（catch 忽略错误，路径为空时 Rust 端直接返回 `no_md_path_configured`）
- **新依赖**: `tauri-plugin-dialog` (Rust + npm) + `capabilities/default.json` 添加 `dialog:default`
- **Settings KV**: 新增 `md_file_path` 键

### 开发端口迁移
- Vite 端口从 1420 改为 **1422**（避免端口冲突），`vite.config.ts` `strictPort: false`，`tauri.conf.json` `devUrl` 同步更新

### 周视图移除
- `CalendarHeader.tsx` 移除视图切换按钮，只保留月份导航

---

## 当前代码结构

```
src/
├── App.tsx                      # 窗口路由 (widget/panel/aichat)
├── index.css                    # Tailwind 导入 + shadcn neutral base + 动画
├── lib/
│   ├── utils.ts                 # cn() 工具函数
│   └── events.ts                # 跨窗口事件总线（notify_all 广播）
├── types/index.ts               # TS 类型 (Block/Item/ThemeConfig 含文字色+字号)
├── store/
│   ├── useBlocksStore.ts        # 区块 CRUD + emitDataChanged
│   ├── useItemsStore.ts         # 事项 CRUD + 日历 + 完成 + emitDataChanged
│   ├── useSettingsStore.ts      # 主题 + AI 配置 + emitSettingsChanged (含文字色+字号)
│   └── useAIStore.ts            # AI 聊天状态
├── components/
│   ├── theme/
│   │   ├── themeConfig.ts       # 3主题×2模式色板 + 优先级颜色/标签
│   │   └── ThemeProvider.tsx    # 注入 --primary/--ring + dark class(font-size+text-color)
│   ├── ui/                      # 16个 shadcn 组件（含 GlassPanel 毛玻璃版）
│   ├── widget/
│   │   ├── WidgetWindow.tsx     # 根组件（毛玻璃背景+Acrylic+左日历右区块+AI输入+跨窗口监听）
│   │   ├── CalendarHeader.tsx   # 月/年导航
│   │   ├── CalendarCell.tsx     # 单日格子（自适应高度+最多6行事项+Checkbox）
│   │   ├── MonthView.tsx        # 月日历网格（auto-rows-fr 均分）
│   │   ├── BlockCard.tsx        # 区块卡片（毛玻璃样式+Checkbox）
│   │   └── AIInputBar.tsx       # AI 快速输入 + 区块关键词模糊匹配
│   ├── panel/
│   │   ├── PanelWindow.tsx      # 主面板根组件 + 跨窗口监听
│   │   ├── BlockSidebar.tsx     # 区块列表（新建/删除/显示隐藏）
│   │   ├── BlockCardGrid.tsx    # 总览卡片网格
│   │   ├── BlockDetailArea.tsx  # 事项 CRUD 详情区
│   │   └── SettingsPage.tsx     # 设置页（透明度/字号/桌面色/文字色/面板色/主题/AI/MD路径）
│   └── aichat/
│       └── AIChatWindow.tsx     # AI 聊天（完整对话界面）
└── src-tauri/
    ├── Cargo.toml
    ├── tauri.conf.json           # 窗口配置 (widget transparent)
    ├── capabilities/default.json # 权限 (含 allow-set-effects)
    └── src/
        ├── main.rs
        ├── lib.rs                # setup + 命令注册 + desktop_pin + notify_all (Alt+Space 硬编码)
        ├── db.rs                 # SQLite + 默认数据 (含 md_file_path, hotkey_shortcut)
        ├── models.rs             # Rust 结构体
        └── commands/
            ├── mod.rs
            ├── ai.rs             # ai_parse (含动态日期+区块名) + ai_chat
            ├── blocks.rs         # 区块 CRUD
            ├── items.rs          # 事项 CRUD + 日历月数据 + 自动顺延
            ├── completions.rs    # 完成/取消完成
            ├── settings.rs       # KV 配置
            └── sync_md.rs        # Markdown 实时同步 + 原生文件对话框
```

完整 PRD: `F:\idea\todo\ai-todo\PRD.md`

---

## ThemeConfig 完整字段

```typescript
interface ThemeConfig {
  theme: ThemeName;              // 'cartoon' | 'pixel' | 'tech'
  mode: ThemeMode;               // 'light' | 'dark'
  widget_opacity: number;        // 0.1-0.9，值越大毛玻璃越透
  widget_primary_color: string;  // 桌面背景色调 (hex)
  widget_text_color: string;     // 桌面文字色 ('' 跟随主题, 否则覆盖)
  panel_primary_color: string;   // 面板主色 (hex)
  widget_font_size: number;      // 9-18px，默认 11
  ai_api_key: string;
  ai_endpoint: string;           // 默认 'https://api.anthropic.com/v1/messages'
  md_file_path: string;           // Markdown 同步文件路径 ('' 不启用)
}
```

---

## 当前完成/待办清单

### ✅ 已完成

- [x] Rust 后端全部 **23** 个 IPC 命令 + SQLite 数据层
- [x] TypeScript 类型 + 4 个 Zustand store
- [x] 主题系统（3 主题 × 2 模式），ThemeProvider 仅覆盖 primary+ring，shadcn 默认中性色板回归
- [x] Widget 窗口左右布局（左60%日历 + 右40%区块列表），毛玻璃背景 + 原生 Acrylic
- [x] 主面板全部组件（侧栏、总览卡片、详情 CRUD、设置）
- [x] shadcn/ui 全面集成，neutral base 色板 + GlassPanel 毛玻璃组件 + Checkbox 统一三处使用
- [x] AI 输入 → `ai_parse` 后端 → 自动匹配区块创建事项（含日期+区块归类修复）
- [x] 日历格子展示事项 + Checkbox 勾选/取消完成（竖向 auto-rows-fr 自适应）
- [x] **Alt+Space 全局热键**（Windows 桌面固定 + 3秒延迟恢复，当前硬编码）
- [x] **AI 聊天窗口**（完整对话界面，支持上下文）
- [x] **跨窗口实时同步**（通过 Rust `notify_all` 广播事件）
- [x] 区块显示/隐藏实时同步
- [x] 设置页完整：透明度/字号/桌面色/文字色/面板色/主题/AI/MD文件路径
- [x] 日历每格显示 6 行待办
- [x] 周视图切换按钮已移除（仅月视图）
- [x] **Markdown 实时同步**（`sync_to_markdown` + `pick_md_file_path` + tauri-plugin-dialog）
- [x] `hotkey_shortcut` Settings KV + `register_global_shortcut` IPC 命令预备（设置页 UI 待接入）

### 🟡 P1 — 重要功能

- [ ] **自动顺延** — 后端 `run_auto_rollover` 已实现，前端未调用（应在应用启动时或每日首次打开时触发）
- [ ] **deadline 前 3 天脉冲动画** — 日历格子和事项列表已有红色边框，缺脉冲动画
- [ ] **设置页快捷键 UI** — `hotkey_shortcut` KV 已就绪，`register_global_shortcut` 命令已注册，前端 SettingsPage 添加快捷键输入+按钮即可接入

### 🟢 P2 — 增强

- [ ] **SVG 图标系统** — 3 套主题化 SVG 图标集，替换 lucide-react
- [ ] 应用图标 + 打包签名

### 🐛 已知问题

- 跨窗口事件通过 Rust `notify_all` 命令工作，但 `app.emit()` 在某些 Tauri 2 版本中可能只在当前窗口接收——如果出现不同步，需改为 `app.get_webview_window(label)?.emit()` 逐个窗口广播
- `register_global_shortcut` + `parse_shortcut`/`parse_code` 从 lib.rs 中移除（因编译错误），`hotkey_shortcut` KV 和 IPC 命令均就绪，但 lib.rs 启动时仍是硬编码 Alt+Space。后续重新实现时需修复 `conn` 生命周期问题（在 setup closure 中直接 `app.handle()` 获取 DB 连接，或使用 blocking Mutex lock 保存 result）

---

## 关键实现细节

### 毛玻璃悬浮窗

```
WidgetWindow return:
  <div relative bg-transparent>              // 透明容器
    <div absolute inset-0 backdrop-blur-2xl/> // 模糊层
    <div absolute inset-0                     // 色调层 = widget_primary_color + alpha
      style={{ backgroundColor: hexToRgba(tintColor, bgAlpha) }} />
    <div relative z-10>                       // 内容层（文字不模糊、不受透明度影响）
      GlassPanel / BlockCard / ...           // 内层玻璃组件
```

- `tintColor = config.widget_primary_color`（设置中调整）
- `bgAlpha = 0.95 - config.widget_opacity * 0.90`（slider 0.1→0.9 映射 alpha 0.85→0.15，值越大越透）
- 内层 `GlassPanel` 使用 `bg-gradient-to-b from-white/[0.08] backdrop-blur-xl border-white/20` 双重玻璃
- 启动时 `window.setEffects([Effect.Acrylic])` 启用 Windows 11 原生 Acrylic

### 字体大小继承链

```
WidgetWindow style={{ fontSize: config.widget_font_size + 'px' }}
  ├── CalendarHeader: style={{ fontSize: '1.1em' }}     // 月标题稍大
  ├── MonthView:  style={{ fontSize: '0.85em' }}        // 星期头稍小
  ├── CalendarCell: 继承 1em + 溢出行 style={{ fontSize: '0.75em' }}
  ├── BlockCard: 计数 style={{ fontSize: '0.85em' }} / 日期 style={{ fontSize: '0.75em' }}
  └── AIInputBar: Button style={{ fontSize: '0.85em' }}
```

所有硬编码 `text-[Npx]` Tailwind 类已移除，全部改为相对 `em` 值。

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
4. 网格使用 `auto-rows-fr` 均分垂直空间

### AI 解析数据流

1. 用户输入自然语言 → `invoke('ai_parse', { text })`
2. Rust 端调用配置的 LLM API（兼容 OpenAI 格式）
3. Prompt 动态注入：当前日期、明天日期、用户区块名列表
4. 返回 `Vec<AiParseResult>` → 前端匹配已有区块：
   - 精确名称匹配 → 大小写不敏感 → 部分包含 → 单字关键词 → 回退"待办"
   - **不自动创建**新区块
5. `create_item` 创建事项

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
| `register_global_shortcut` | shortcut_str, old_shortcut? | `String` | 注册/替换快捷键 |
| `sync_to_markdown` | — | `String` | 全量同步到 md 文件 |
| `pick_md_file_path` | — | `Option<String>` | 原生保存对话框 |

---

## Settings KV 键名速查

前端通过 `set_setting` 写入的键名（存在 SQLite `settings` 表）：

| key | 值示例 | 说明 |
|-----|--------|------|
| `theme` | `"tech"` | 主题名 |
| `mode` | `"dark"` | 明暗模式 |
| `widget_opacity` | `"0.85"` | 透明度 0.1-0.9 |
| `widget_primary_color` | `"#6366f1"` | 桌面背景色调 |
| `widget_text_color` | `"#ffffff"` 或 `""` | 桌面文字色（空=跟随主题） |
| `panel_primary_color` | `"#6366f1"` | 面板主色 |
| `widget_font_size` | `"11"` | 字号 9-18 px |
| `ai_api_key` | `"sk-..."` | AI API Key |
| `ai_model` | `"claude-sonnet-4-6"` | AI 模型名 |
| `ai_endpoint` | `"https://..."` | AI API 地址 |
| `md_file_path` | `"F:\\todo\\doodle.md"` 或 `""` | Markdown 同步路径 |
| `hotkey_shortcut` | `"Alt+Space"` | 全局快捷键（可自定义） |

---

## 设计语言快速参考

- **悬浮窗背景**：`widget_primary_color` 为色调 + `backdrop-blur-2xl` 模糊 + Alpha 控制透明度
- **文字**：由 `widget_text_color`（或主题色）控制，`widget_font_size` 控制基准大小
- **内层玻璃**：`GlassPanel` / `BlockCard` 使用 `bg-gradient-to-b from-white/[0.08] backdrop-blur-xl border-white/20`
- **字号层级**：全部相对 `em`，基准 9-18px 可调
- **间距**：内容区 `p-4`，卡片间 `gap-3`，顶栏 `h-11`，侧栏 `w-52`
- **圆角**：`rounded-md`（6px）通用，`rounded-xl`（12px）玻璃卡片
- **卡片**：shadcn Card 结构用于面板，GlassPanel/BlockCard 使用独立玻璃样式
