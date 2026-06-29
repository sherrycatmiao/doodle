use crate::db::get_connection;
use crate::models::Block;
use tauri::AppHandle;
use uuid::Uuid;

#[tauri::command]
pub fn get_blocks(app: AppHandle) -> Result<Vec<Block>, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, icon, color, sort_order, show_on_desktop, created_at FROM blocks ORDER BY sort_order")
        .map_err(|e| e.to_string())?;
    let blocks = stmt
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
    Ok(blocks)
}

#[tauri::command]
pub fn create_block(
    app: AppHandle,
    name: String,
    icon: String,
    color: String,
) -> Result<Block, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let sort_order: i32 = conn
        .query_row("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM blocks", [], |r| {
            r.get(0)
        })
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO blocks (id, name, icon, color, sort_order) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, name, icon, color, sort_order],
    )
    .map_err(|e| e.to_string())?;
    Ok(Block {
        id,
        name,
        icon,
        color,
        sort_order,
        show_on_desktop: true,
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_block(
    app: AppHandle,
    id: String,
    name: Option<String>,
    icon: Option<String>,
    color: Option<String>,
    show_on_desktop: Option<bool>,
) -> Result<Block, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    if let Some(ref name) = name {
        conn.execute("UPDATE blocks SET name = ?1 WHERE id = ?2", rusqlite::params![name, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref icon) = icon {
        conn.execute("UPDATE blocks SET icon = ?1 WHERE id = ?2", rusqlite::params![icon, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(ref color) = color {
        conn.execute("UPDATE blocks SET color = ?1 WHERE id = ?2", rusqlite::params![color, id])
            .map_err(|e| e.to_string())?;
    }
    if let Some(show) = show_on_desktop {
        conn.execute(
            "UPDATE blocks SET show_on_desktop = ?1 WHERE id = ?2",
            rusqlite::params![show as i32, id],
        )
        .map_err(|e| e.to_string())?;
    }
    let block = conn
        .query_row(
            "SELECT id, name, icon, color, sort_order, show_on_desktop, created_at FROM blocks WHERE id = ?1",
            rusqlite::params![id],
            |row| {
                Ok(Block {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    icon: row.get(2)?,
                    color: row.get(3)?,
                    sort_order: row.get(4)?,
                    show_on_desktop: row.get::<_, i32>(5)? != 0,
                    created_at: row.get(6)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    Ok(block)
}

#[tauri::command]
pub fn delete_block(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM blocks WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
