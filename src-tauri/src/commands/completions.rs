use crate::db::get_connection;
use crate::models::CompletionRecord;
use tauri::AppHandle;
use uuid::Uuid;

/// Look up the "已完成" block ID by name
fn get_completed_block_id(conn: &rusqlite::Connection) -> Result<String, String> {
    conn.query_row(
        "SELECT id FROM blocks WHERE name = '已完成'",
        [],
        |row| row.get(0),
    )
    .map_err(|_| "找不到「已完成」区块".to_string())
}

/// Complete an item: move it to the "已完成" block
#[tauri::command]
pub fn complete_item(
    app: AppHandle,
    item_id: String,
    date: String,
) -> Result<CompletionRecord, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    // Get item's current block_id (original)
    let original_block_id: String = conn
        .query_row(
            "SELECT block_id FROM items WHERE id = ?1",
            rusqlite::params![item_id],
            |row| row.get(0),
        )
        .map_err(|_| "事项不存在".to_string())?;

    let completed_block_id = get_completed_block_id(&conn)?;

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    // Insert completion record with original_block_id
    conn.execute(
        "INSERT INTO completion_records (id, item_id, original_block_id, completed_date, completed_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![id, item_id, original_block_id, date, now],
    )
    .map_err(|e| e.to_string())?;

    // Move item to 已完成 block and set status
    conn.execute(
        "UPDATE items SET block_id = ?1, status = 'completed', completed_at = ?2 WHERE id = ?3",
        rusqlite::params![completed_block_id, now, item_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(CompletionRecord {
        id,
        item_id,
        original_block_id,
        completed_date: date,
        completed_at: now,
    })
}

/// Uncomplete an item: restore it to its original block
#[tauri::command]
pub fn uncomplete_item(app: AppHandle, item_id: String, date: String) -> Result<(), String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    // Get the original_block_id from the completion record being removed
    let original_block_id: Option<String> = conn
        .query_row(
            "SELECT original_block_id FROM completion_records WHERE item_id = ?1 AND completed_date = ?2",
            rusqlite::params![item_id, date],
            |row| row.get(0),
        )
        .ok();

    // Delete the completion record
    conn.execute(
        "DELETE FROM completion_records WHERE item_id = ?1 AND completed_date = ?2",
        rusqlite::params![item_id, date],
    )
    .map_err(|e| e.to_string())?;

    // Check if there are remaining completion records
    let count: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM completion_records WHERE item_id = ?1",
            rusqlite::params![item_id],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count == 0 {
        // Restore to original block, set active
        if let Some(ref orig_block) = original_block_id {
            conn.execute(
                "UPDATE items SET block_id = ?1, status = 'active', completed_at = NULL WHERE id = ?2",
                rusqlite::params![orig_block, item_id],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_completions(
    app: AppHandle,
    item_id: Option<String>,
) -> Result<Vec<CompletionRecord>, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;

    let sql = if item_id.is_some() {
        "SELECT id, item_id, original_block_id, completed_date, completed_at FROM completion_records WHERE item_id = ?1 ORDER BY completed_date DESC"
    } else {
        "SELECT id, item_id, original_block_id, completed_date, completed_at FROM completion_records ORDER BY completed_date DESC"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let records: Vec<CompletionRecord> = if let Some(ref id) = item_id {
        stmt.query_map(rusqlite::params![id], |row| {
            Ok(CompletionRecord {
                id: row.get(0)?,
                item_id: row.get(1)?,
                original_block_id: row.get(2)?,
                completed_date: row.get(3)?,
                completed_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], |row| {
            Ok(CompletionRecord {
                id: row.get(0)?,
                item_id: row.get(1)?,
                original_block_id: row.get(2)?,
                completed_date: row.get(3)?,
                completed_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    Ok(records)
}
