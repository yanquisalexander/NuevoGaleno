use std::path::PathBuf;

pub fn db_file_path() -> Result<PathBuf, String> {
    crate::db::path::db_file_path()
}

#[tauri::command]
pub fn init_app_db() -> Result<String, String> {
    let db_path = db_file_path()?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| format!("sqlite open err: {}", e))?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT, created_at TEXT)",
        [],
    )
    .map_err(|e| format!("sqlite exec err: {}", e))?;
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_config(key: String, value: String) -> Result<(), String> {
    let db_path = db_file_path()?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| format!("sqlite open err: {}", e))?;
    conn.execute(
        "INSERT INTO app_config(key, value, created_at) VALUES (?1, ?2, datetime('now')) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        rusqlite::params![key, value],
    )
    .map_err(|e| format!("sqlite exec err: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn get_config(key: String) -> Result<Option<String>, String> {
    let db_path = db_file_path()?;
    let conn = rusqlite::Connection::open(&db_path).map_err(|e| format!("sqlite open err: {}", e))?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_config WHERE key = ?1")
        .map_err(|e| format!("sqlite prepare err: {}", e))?;
    let mut rows = stmt
        .query_map([key], |row| row.get::<_, String>(0))
        .map_err(|e| format!("sqlite query err: {}", e))?;
    if let Some(Ok(val)) = rows.next() {
        Ok(Some(val))
    } else {
        Ok(None)
    }
}
