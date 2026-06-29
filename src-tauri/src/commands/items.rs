use crate::db::get_connection;
use crate::models::*;
use chrono::Datelike;
use tauri::AppHandle;
use uuid::Uuid;

fn map_item_row(row: &rusqlite::Row) -> rusqlite::Result<Item> {
    Ok(Item {
        id: row.get(0)?,
        block_id: row.get(1)?,
        content: row.get(2)?,
        item_type: row.get(3)?,
        priority: row.get(4)?,
        status: row.get(5)?,
        due_date: row.get(6)?,
        start_date: row.get(7)?,
        is_date_linked: row.get::<_, i32>(8)? != 0,
        completed_at: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

#[tauri::command]
pub fn get_items(app: AppHandle, block_id: Option<String>) -> Result<Vec<Item>, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let sql = if block_id.is_some() {
        "SELECT id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, completed_at, created_at, updated_at FROM items WHERE block_id = ?1 ORDER BY created_at DESC".to_string()
    } else {
        "SELECT id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, completed_at, created_at, updated_at FROM items ORDER BY created_at DESC".to_string()
    };
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let items = if let Some(ref bid) = block_id {
        stmt.query_map(rusqlite::params![bid], map_item_row)
            .map_err(|e| e.to_string())?
    } else {
        stmt.query_map([], map_item_row)
            .map_err(|e| e.to_string())?
    }
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn create_item(app: AppHandle, input: CreateItemInput) -> Result<Item, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let item_type = input.item_type.unwrap_or_else(|| "todo".to_string());
    let priority = input.priority.unwrap_or_else(|| "neither".to_string());
    let is_date_linked = input.is_date_linked.unwrap_or(false);
    conn.execute(
        "INSERT INTO items (id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, 'active', ?6, ?7, ?8, ?9, ?9)",
        rusqlite::params![id, input.block_id, input.content, item_type, priority, input.due_date, input.start_date, is_date_linked as i32, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(Item {
        id,
        block_id: input.block_id,
        content: input.content,
        item_type,
        priority,
        status: "active".into(),
        due_date: input.due_date,
        start_date: input.start_date,
        is_date_linked,
        completed_at: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn update_item(app: AppHandle, input: UpdateItemInput) -> Result<Item, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    if let Some(ref content) = input.content {
        conn.execute(
            "UPDATE items SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![content, input.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref priority) = input.priority {
        conn.execute(
            "UPDATE items SET priority = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![priority, input.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref status) = input.status {
        conn.execute(
            "UPDATE items SET status = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![status, input.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref due_date) = input.due_date {
        conn.execute(
            "UPDATE items SET due_date = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![due_date, input.id],
        )
        .map_err(|e| e.to_string())?;
    }
    if let Some(ref start_date) = input.start_date {
        conn.execute(
            "UPDATE items SET start_date = ?1, updated_at = datetime('now') WHERE id = ?2",
            rusqlite::params![start_date, input.id],
        )
        .map_err(|e| e.to_string())?;
    }
    let item = conn
        .query_row(
            "SELECT id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, completed_at, created_at, updated_at FROM items WHERE id = ?1",
            rusqlite::params![input.id],
            map_item_row,
        )
        .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub fn delete_item(app: AppHandle, id: String) -> Result<(), String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM items WHERE id = ?1", rusqlite::params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_items_by_date(app: AppHandle, date: String) -> Result<Vec<Item>, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT DISTINCT i.id, i.block_id, i.content, i.item_type, i.priority, i.status, i.due_date, i.start_date, i.is_date_linked, i.completed_at, i.created_at, i.updated_at
             FROM items i
             LEFT JOIN completion_records cr ON cr.item_id = i.id AND cr.completed_date = ?1
             WHERE i.due_date = ?1 AND i.status = 'active'
             ORDER BY i.priority ASC, i.created_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let items = stmt
        .query_map(rusqlite::params![date], map_item_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    Ok(items)
}

#[tauri::command]
pub fn get_calendar_month(app: AppHandle, year: i32, month: u32) -> Result<CalendarMonthData, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let first_day = chrono::NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or("Invalid date".to_string())?;
    let last_day = {
        let next = if month == 12 {
            chrono::NaiveDate::from_ymd_opt(year + 1, 1, 1)
        } else {
            chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        }
        .ok_or("Invalid date".to_string())?;
        next.pred_opt().ok_or("Invalid date".to_string())?
    };
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    // Get all items with due_date in this month
    let month_start_str = first_day.format("%Y-%m-%d").to_string();
    let month_end_str = last_day.format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT i.id, i.block_id, i.content, i.item_type, i.priority, i.status,
                    i.due_date, i.start_date, i.is_date_linked, i.completed_at, i.created_at, i.updated_at,
                    cr.completed_date
             FROM items i
             LEFT JOIN completion_records cr ON cr.item_id = i.id
             WHERE i.due_date >= ?1 AND i.due_date <= ?2 AND i.is_date_linked = 1
             ORDER BY i.due_date ASC, i.priority ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![month_start_str, month_end_str], |row| {
            let item = Item {
                id: row.get(0)?,
                block_id: row.get(1)?,
                content: row.get(2)?,
                item_type: row.get(3)?,
                priority: row.get(4)?,
                status: row.get(5)?,
                due_date: row.get(6)?,
                start_date: row.get(7)?,
                is_date_linked: row.get::<_, i32>(8)? != 0,
                completed_at: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            };
            let completed_date: Option<String> = row.get(12)?;
            Ok((item, completed_date))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // Build calendar days
    let weekday_offset = first_day.weekday().num_days_from_monday();
    let mut days = Vec::new();

    // Padding days before the 1st
    if let Some(prev_last) = first_day.pred_opt() {
        let prev_last_day = prev_last.day();
        let (prev_year, prev_month) = if month == 1 {
            (year - 1, 12)
        } else {
            (year, month - 1)
        };
        for i in (0..weekday_offset).rev() {
            let d = prev_last_day - i;
            let date_str = format!("{:04}-{:02}-{:02}", prev_year, prev_month, d);
            days.push(CalendarDay {
                date: date_str,
                day_of_month: d,
                is_current_month: false,
                is_today: false,
                items: vec![],
            });
        }
    }

    // Current month days
    for d in 1..=last_day.day() {
        let date_str = format!("{:04}-{:02}-{:02}", year, month, d);
        let is_today = date_str == today;
        let day_items: Vec<ItemWithCompletion> = rows
            .iter()
            .filter(|(item, _)| item.due_date.as_deref() == Some(&date_str))
            .map(|(item, completed_date)| ItemWithCompletion {
                item: item.clone(),
                completed_on_this_date: completed_date.is_some(),
            })
            .collect();
        days.push(CalendarDay {
            date: date_str,
            day_of_month: d,
            is_current_month: true,
            is_today,
            items: day_items,
        });
    }

    // Padding days after the last day
    let remaining = 7 - (days.len() as u32 % 7);
    if remaining < 7 {
        let (next_year, next_month) = if month == 12 {
            (year + 1, 1)
        } else {
            (year, month + 1)
        };
        for d in 1..=remaining {
            let date_str = format!("{:04}-{:02}-{:02}", next_year, next_month, d);
            days.push(CalendarDay {
                date: date_str,
                day_of_month: d,
                is_current_month: false,
                is_today: false,
                items: vec![],
            });
        }
    }

    Ok(CalendarMonthData { year, month, days })
}

#[tauri::command]
pub fn run_auto_rollover(app: AppHandle) -> Result<Vec<Item>, String> {
    let conn = get_connection(&app);
    let conn = conn.lock().map_err(|e| e.to_string())?;
    let today = chrono::Local::now().format("%Y-%m-%d").to_string();

    let mut stmt = conn
        .prepare(
            "SELECT id, block_id, content, item_type, priority, status, due_date, start_date, is_date_linked, completed_at, created_at, updated_at
             FROM items WHERE status = 'active' AND due_date < ?1 AND is_date_linked = 1
             ORDER BY due_date ASC",
        )
        .map_err(|e| e.to_string())?;

    let items = stmt
        .query_map(rusqlite::params![today], map_item_row)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(items)
}
