use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

// ─── Structs ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelliSenseEvent {
    pub id: i64,
    pub user_id: String,
    pub event_type: String,
    pub payload: Option<String>,
    pub hour: i64,
    pub day_of_week: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEventInput {
    pub user_id: String,
    pub event_type: String,
    pub payload: Option<String>,
    pub hour: i64,
    pub day_of_week: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelliSenseWorkflow {
    pub id: i64,
    pub user_id: String,
    pub name: String,
    pub app_ids: String, // JSON array
    pub icon: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkflowInput {
    pub user_id: String,
    pub name: String,
    pub app_ids: String, // JSON array
    pub icon: Option<String>,
}

// ─── Events ──────────────────────────────────────────────────────────────────

pub fn create_event(input: CreateEventInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO intellisense_events (user_id, event_type, payload, hour, day_of_week, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            input.user_id,
            input.event_type,
            input.payload,
            input.hour,
            input.day_of_week,
            now,
        ],
    )
    .map_err(|e| format!("intellisense create_event err: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_events(user_id: &str, limit: i64) -> Result<Vec<IntelliSenseEvent>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, event_type, payload, hour, day_of_week, created_at
             FROM intellisense_events
             WHERE user_id = ?1
             ORDER BY created_at DESC
             LIMIT ?2",
        )
        .map_err(|e| format!("intellisense get_events prepare err: {}", e))?;

    let rows = stmt
        .query_map(params![user_id, limit], |row| {
            Ok(IntelliSenseEvent {
                id: row.get(0)?,
                user_id: row.get(1)?,
                event_type: row.get(2)?,
                payload: row.get(3)?,
                hour: row.get(4)?,
                day_of_week: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("intellisense get_events query err: {}", e))?;

    let events: Result<Vec<_>, _> = rows.collect();
    events.map_err(|e| format!("intellisense get_events collect err: {}", e))
}

/// Elimina eventos más antiguos que `days` días para mantener la ventana rotante
pub fn prune_old_events(user_id: &str, days: i64) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM intellisense_events
         WHERE user_id = ?1
           AND created_at < datetime('now', ?2)",
        params![user_id, format!("-{} days", days)],
    )
    .map_err(|e| format!("intellisense prune_old_events err: {}", e))?;

    Ok(())
}

// ─── Workflows ───────────────────────────────────────────────────────────────

pub fn create_workflow(input: CreateWorkflowInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO intellisense_workflows (user_id, name, app_ids, icon, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![input.user_id, input.name, input.app_ids, input.icon, now,],
    )
    .map_err(|e| format!("intellisense create_workflow err: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_workflows(user_id: &str) -> Result<Vec<IntelliSenseWorkflow>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, name, app_ids, icon, created_at
             FROM intellisense_workflows
             WHERE user_id = ?1
             ORDER BY created_at ASC",
        )
        .map_err(|e| format!("intellisense get_workflows prepare err: {}", e))?;

    let rows = stmt
        .query_map(params![user_id], |row| {
            Ok(IntelliSenseWorkflow {
                id: row.get(0)?,
                user_id: row.get(1)?,
                name: row.get(2)?,
                app_ids: row.get(3)?,
                icon: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| format!("intellisense get_workflows query err: {}", e))?;

    let workflows: Result<Vec<_>, _> = rows.collect();
    workflows.map_err(|e| format!("intellisense get_workflows collect err: {}", e))
}

pub fn delete_workflow(id: i64, user_id: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM intellisense_workflows WHERE id = ?1 AND user_id = ?2",
        params![id, user_id],
    )
    .map_err(|e| format!("intellisense delete_workflow err: {}", e))?;

    Ok(())
}
