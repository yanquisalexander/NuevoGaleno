use super::get_connection;
use chrono::Utc;
use rusqlite::params;

pub fn set_config(key: &str, value: &str) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO app_config(key, value, created_at) VALUES (?1, ?2, ?3) 
         ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        params![key, value, now],
    )
    .map_err(|e| format!("Error guardando configuración: {}", e))?;

    Ok(())
}

pub fn get_config(key: &str) -> Result<Option<String>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT value FROM app_config WHERE key = ?1")
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![key], |row| row.get::<_, String>(0));

    match result {
        Ok(value) => Ok(Some(value)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo configuración: {}", e)),
    }
}
