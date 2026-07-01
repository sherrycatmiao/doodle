use crate::db::get_connection;
use crate::models::Block;
use tauri::AppHandle;

/// A minimal row from the items table for markdown rendering.
struct ItemRow {
    content: String,
    priority: String,
    due_date: Option<String>,
    item_type: String,
}

fn query_items(conn: &rusqlite::Connection, block_id: &str, status: &str) -> Result<Vec<ItemRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT content, priority, due_date, item_type
             FROM items WHERE block_id = ?1 AND status = ?2
             ORDER BY priority ASC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params![block_id, status], |row| {
            Ok(ItemRow {
                content: row.get(0)?,
                priority: row.get(1)?,
                due_date: row.get(2)?,
                item_type: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

fn format_item(item: &ItemRow, is_completed: bool) -> String {
    let prefix = if is_completed {
        "✅"
    } else {
        match item.priority.as_str() {
            "urgent_important" | "urgent_not_important" => "🔴",
            "important_not_urgent" => "🟡",
            _ => "⬜",
        }
    };
    let date_tag = match &item.due_date {
        Some(d) => format!(" 📅 {}", d),
        None => String::new(),
    };
    let type_tag = match item.item_type.as_str() {
        "idea" => " 💡",
        "progress" => " 🔄",
        _ => "",
    };
    format!("- {} {}{}{}\n", prefix, item.content, date_tag, type_tag)
}

/// Open a native save dialog to let the user pick a markdown file path.
#[tauri::command]
pub async fn pick_md_file_path(app: AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .add_filter("Markdown", &["md"])
        .blocking_save_file();
    Ok(path.map(|p| p.to_string()))
}

/// Format all blocks and items as markdown and write to the configured file path.
/// Called after every data mutation. Writes atomically via a temp file.
#[tauri::command]
pub fn sync_to_markdown(app: AppHandle) -> Result<String, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    // 1. Check configured path
    let md_path: Option<String> = conn
        .query_row(
            "SELECT value FROM settings WHERE key = 'md_file_path'",
            [],
            |row| row.get(0),
        )
        .ok()
        .and_then(|v: String| if v.trim().is_empty() { None } else { Some(v) });

    let md_path = match md_path {
        Some(p) => p,
        None => return Ok("no_md_path_configured".to_string()),
    };

    // Ensure parent directory exists
    let path = std::path::Path::new(&md_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("无法创建目录: {}", e))?;
    }

    // 2. Fetch all blocks
    let mut stmt = conn
        .prepare("SELECT id, name, icon, color, sort_order, show_on_desktop, created_at FROM blocks ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let blocks: Vec<Block> = stmt
        .query_map([], |row| {
            Ok(Block {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                color: row.get(3)?,
                sort_order: row.get(4)?,
                show_on_desktop: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // 3. Build markdown
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let mut md = String::new();
    md.push_str(&format!("# Doodle 待办清单\n\n> 最后同步: {}\n\n", now));
    md.push_str("---\n\n");

    // Summary
    let active_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM items WHERE status = 'active'", [], |r| r.get(0))
        .unwrap_or(0);
    let completed_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM items WHERE status = 'completed'", [], |r| r.get(0))
        .unwrap_or(0);
    md.push_str(&format!(
        "**总计**: {} 活跃 · {} 已完成\n\n",
        active_count, completed_count
    ));

    for block in &blocks {
        md.push_str(&format!("## {}\n\n", block.name));

        let active_items = query_items(&conn, &block.id, "active")?;
        let completed_items = query_items(&conn, &block.id, "completed")?;

        if active_items.is_empty() && completed_items.is_empty() {
            md.push_str("*（空）*\n\n");
            continue;
        }

        for item in &active_items {
            md.push_str(&format_item(item, false));
        }
        for item in &completed_items {
            md.push_str(&format_item(item, true));
        }
        md.push('\n');
    }

    // 4. Write atomically: write to temp file then rename
    let tmp_path = format!("{}.tmp", md_path);
    std::fs::write(&tmp_path, &md)
        .map_err(|e| format!("写入临时文件失败: {}", e))?;
    std::fs::rename(&tmp_path, &md_path)
        .map_err(|e| format!("重命名文件失败: {}", e))?;

    Ok(md_path)
}
