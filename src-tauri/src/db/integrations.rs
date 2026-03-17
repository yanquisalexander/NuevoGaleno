use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationCommand {
    pub command: String,
    #[serde(default)]
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationFlow {
    pub id: i64,
    pub name: String,
    pub event_type: String,
    pub enabled: bool,
    pub commands: Vec<IntegrationCommand>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntegrationFlowInput {
    pub name: String,
    pub event_type: String,
    pub enabled: bool,
    pub commands: Vec<IntegrationCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationProcedure {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub version: i64,
    pub commands: Vec<IntegrationCommand>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntegrationProcedureInput {
    pub name: String,
    pub description: Option<String>,
    pub commands: Vec<IntegrationCommand>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationRun {
    pub id: i64,
    pub flow_id: i64,
    pub event_type: String,
    pub status: String,
    pub error: Option<String>,
    pub payload_json: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationRunStep {
    pub id: i64,
    pub run_id: i64,
    pub step_index: i64,
    pub command: String,
    pub status: String,
    pub output_json: Option<String>,
    pub error: Option<String>,
    pub created_at: String,
}

pub fn create_flow(input: CreateIntegrationFlowInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let commands_json = serde_json::to_string(&input.commands)
        .map_err(|e| format!("integration create_flow serialize err: {}", e))?;

    conn.execute(
        "INSERT INTO integration_flows (name, event_type, enabled, commands_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            input.name,
            input.event_type,
            if input.enabled { 1 } else { 0 },
            commands_json,
            now,
            now
        ],
    )
    .map_err(|e| format!("integration create_flow err: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn update_flow(id: i64, input: CreateIntegrationFlowInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let commands_json = serde_json::to_string(&input.commands)
        .map_err(|e| format!("integration update_flow serialize err: {}", e))?;

    conn.execute(
        "UPDATE integration_flows
         SET name = ?1, event_type = ?2, enabled = ?3, commands_json = ?4, updated_at = ?5
         WHERE id = ?6",
        params![
            input.name,
            input.event_type,
            if input.enabled { 1 } else { 0 },
            commands_json,
            now,
            id
        ],
    )
    .map_err(|e| format!("integration update_flow err: {}", e))?;

    Ok(())
}

pub fn delete_flow(id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM integration_flows WHERE id = ?1", params![id])
        .map_err(|e| format!("integration delete_flow err: {}", e))?;
    Ok(())
}

pub fn list_flows() -> Result<Vec<IntegrationFlow>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, event_type, enabled, commands_json, created_at, updated_at
             FROM integration_flows
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("integration list_flows prepare err: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let commands_json: String = row.get(4)?;
            let commands =
                serde_json::from_str::<Vec<IntegrationCommand>>(&commands_json).unwrap_or_default();

            Ok(IntegrationFlow {
                id: row.get(0)?,
                name: row.get(1)?,
                event_type: row.get(2)?,
                enabled: row.get::<_, i64>(3)? == 1,
                commands,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("integration list_flows query err: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("integration list_flows collect err: {}", e))
}

pub fn get_enabled_flows_by_event(
    conn: &Connection,
    event_type: &str,
) -> Result<Vec<IntegrationFlow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, event_type, enabled, commands_json, created_at, updated_at
             FROM integration_flows
             WHERE enabled = 1 AND event_type = ?1
             ORDER BY id ASC",
        )
        .map_err(|e| format!("integration get_enabled_flows_by_event prepare err: {}", e))?;

    let rows = stmt
        .query_map(params![event_type], |row| {
            let commands_json: String = row.get(4)?;
            let commands =
                serde_json::from_str::<Vec<IntegrationCommand>>(&commands_json).unwrap_or_default();

            Ok(IntegrationFlow {
                id: row.get(0)?,
                name: row.get(1)?,
                event_type: row.get(2)?,
                enabled: row.get::<_, i64>(3)? == 1,
                commands,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("integration get_enabled_flows_by_event query err: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("integration get_enabled_flows_by_event collect err: {}", e))
}

pub fn create_procedure(input: CreateIntegrationProcedureInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let commands_json = serde_json::to_string(&input.commands)
        .map_err(|e| format!("integration create_procedure serialize err: {}", e))?;

    conn.execute(
        "INSERT INTO integration_procedures (name, description, version, commands_json, created_at, updated_at)
         VALUES (?1, ?2, 1, ?3, ?4, ?5)",
        params![input.name, input.description, commands_json, now, now],
    )
    .map_err(|e| format!("integration create_procedure err: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn update_procedure(id: i64, input: CreateIntegrationProcedureInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let commands_json = serde_json::to_string(&input.commands)
        .map_err(|e| format!("integration update_procedure serialize err: {}", e))?;

    conn.execute(
        "UPDATE integration_procedures
         SET name = ?1,
             description = ?2,
             version = version + 1,
             commands_json = ?3,
             updated_at = ?4
         WHERE id = ?5",
        params![input.name, input.description, commands_json, now, id],
    )
    .map_err(|e| format!("integration update_procedure err: {}", e))?;

    Ok(())
}

pub fn delete_procedure(id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    conn.execute(
        "DELETE FROM integration_procedures WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("integration delete_procedure err: {}", e))?;
    Ok(())
}

pub fn list_procedures() -> Result<Vec<IntegrationProcedure>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, version, commands_json, created_at, updated_at
             FROM integration_procedures
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("integration list_procedures prepare err: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let commands_json: String = row.get(4)?;
            let commands =
                serde_json::from_str::<Vec<IntegrationCommand>>(&commands_json).unwrap_or_default();

            Ok(IntegrationProcedure {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                version: row.get(3)?,
                commands,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("integration list_procedures query err: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("integration list_procedures collect err: {}", e))
}

pub fn get_procedure_by_id(
    conn: &Connection,
    id: i64,
) -> Result<Option<IntegrationProcedure>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, version, commands_json, created_at, updated_at
             FROM integration_procedures
             WHERE id = ?1",
        )
        .map_err(|e| format!("integration get_procedure_by_id prepare err: {}", e))?;

    let row = stmt.query_row(params![id], |row| {
        let commands_json: String = row.get(4)?;
        let commands =
            serde_json::from_str::<Vec<IntegrationCommand>>(&commands_json).unwrap_or_default();

        Ok(IntegrationProcedure {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            version: row.get(3)?,
            commands,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });

    match row {
        Ok(procedure) => Ok(Some(procedure)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("integration get_procedure_by_id err: {}", e)),
    }
}

pub fn get_procedure_by_name(
    conn: &Connection,
    name: &str,
) -> Result<Option<IntegrationProcedure>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, version, commands_json, created_at, updated_at
             FROM integration_procedures
             WHERE name = ?1",
        )
        .map_err(|e| format!("integration get_procedure_by_name prepare err: {}", e))?;

    let row = stmt.query_row(params![name], |row| {
        let commands_json: String = row.get(4)?;
        let commands =
            serde_json::from_str::<Vec<IntegrationCommand>>(&commands_json).unwrap_or_default();

        Ok(IntegrationProcedure {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            version: row.get(3)?,
            commands,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });

    match row {
        Ok(procedure) => Ok(Some(procedure)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("integration get_procedure_by_name err: {}", e)),
    }
}

pub fn create_run(
    conn: &Connection,
    flow_id: i64,
    event_type: &str,
    payload_json: Option<String>,
) -> Result<i64, String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO integration_runs (flow_id, event_type, status, error, payload_json, started_at, finished_at)
         VALUES (?1, ?2, 'running', NULL, ?3, ?4, NULL)",
        params![flow_id, event_type, payload_json, now],
    )
    .map_err(|e| format!("integration create_run err: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn finish_run(
    conn: &Connection,
    run_id: i64,
    status: &str,
    error: Option<String>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE integration_runs
         SET status = ?1, error = ?2, finished_at = ?3
         WHERE id = ?4",
        params![status, error, now, run_id],
    )
    .map_err(|e| format!("integration finish_run err: {}", e))?;

    Ok(())
}

pub fn add_run_step(
    conn: &Connection,
    run_id: i64,
    step_index: i64,
    command: &str,
    status: &str,
    output_json: Option<String>,
    error: Option<String>,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO integration_run_steps (run_id, step_index, command, status, output_json, error, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![run_id, step_index, command, status, output_json, error, now],
    )
    .map_err(|e| format!("integration add_run_step err: {}", e))?;

    Ok(())
}

pub fn list_runs(limit: i64) -> Result<Vec<IntegrationRun>, String> {
    let conn = get_connection()?;
    let mut stmt = conn
        .prepare(
            "SELECT id, flow_id, event_type, status, error, payload_json, started_at, finished_at
             FROM integration_runs
             ORDER BY id DESC
             LIMIT ?1",
        )
        .map_err(|e| format!("integration list_runs prepare err: {}", e))?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(IntegrationRun {
                id: row.get(0)?,
                flow_id: row.get(1)?,
                event_type: row.get(2)?,
                status: row.get(3)?,
                error: row.get(4)?,
                payload_json: row.get(5)?,
                started_at: row.get(6)?,
                finished_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("integration list_runs query err: {}", e))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("integration list_runs collect err: {}", e))
}
