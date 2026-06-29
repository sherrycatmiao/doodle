use rusqlite::{Connection, Result};
use std::sync::{Arc, Mutex};
use tauri::AppHandle;
use tauri::Manager;

pub struct Database(pub Arc<Mutex<Connection>>);

pub fn init_database(app: &AppHandle) -> Result<()> {
    let app_dir = app
        .path()
        .app_data_dir()
        .expect("failed to get app data dir");
    std::fs::create_dir_all(&app_dir).expect("failed to create app data dir");
    let db_path = app_dir.join("doodle.db");

    let conn = Connection::open(db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS blocks (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#6366f1',
            sort_order INTEGER NOT NULL DEFAULT 0,
            show_on_desktop INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            block_id TEXT NOT NULL,
            content TEXT NOT NULL,
            item_type TEXT NOT NULL DEFAULT 'todo',
            priority TEXT NOT NULL DEFAULT 'neither',
            status TEXT NOT NULL DEFAULT 'active',
            due_date TEXT,
            start_date TEXT,
            is_date_linked INTEGER NOT NULL DEFAULT 0,
            completed_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS completion_records (
            id TEXT PRIMARY KEY,
            item_id TEXT NOT NULL,
            original_block_id TEXT NOT NULL DEFAULT '',
            completed_date TEXT NOT NULL,
            completed_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_items_block_id ON items(block_id);
        CREATE INDEX IF NOT EXISTS idx_items_due_date ON items(due_date);
        CREATE INDEX IF NOT EXISTS idx_completions_item_date ON completion_records(item_id, completed_date);",
    )?;

    // Insert default blocks
    let block_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM blocks", [], |r| r.get(0))
        .unwrap_or(0);
    if block_count == 0 {
        conn.execute_batch(
            "INSERT INTO blocks (id, name, icon, color, sort_order) VALUES
                ('default-todo', '待办', 'todo', '#6366f1', 0);
            INSERT INTO blocks (id, name, icon, color, sort_order) VALUES
                ('default-completed', '已完成', 'completed', '#22c55e', 1);
            INSERT INTO blocks (id, name, icon, color, sort_order) VALUES
                ('default-ideas', '灵感', 'idea', '#f59e0b', 2);",
        )?;
    }

    // Insert default settings
    let setting_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM settings", [], |r| r.get(0))
        .unwrap_or(0);
    if setting_count == 0 {
        conn.execute_batch(
            "INSERT INTO settings (key, value) VALUES
                ('theme', 'tech'),
                ('mode', 'dark'),
                ('widget_opacity', '0.85'),
                ('widget_primary_color', '#6366f1'),
                ('panel_primary_color', '#6366f1'),
                ('ai_api_key', ''),
                ('ai_model', 'claude-sonnet-4-6'),
                ('ai_endpoint', 'https://api.anthropic.com/v1/messages');",
        )?;
    }

    app.manage(Database(Arc::new(Mutex::new(conn))));

    Ok(())
}

pub fn get_connection(app: &AppHandle) -> Arc<Mutex<Connection>> {
    let state = app.state::<Database>();
    Arc::clone(&state.0)
}
