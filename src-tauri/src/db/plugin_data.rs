use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDataEntry {
    pub id: i64,
    pub plugin_id: String,
    pub key: String,
    pub value: String,
    pub value_type: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    pub plugin_id: String,
    pub name: String,
    pub version: String,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: Option<String>,
    pub first_party: bool,
    pub settings: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginLog {
    pub id: i64,
    pub plugin_id: String,
    pub level: String,
    pub message: String,
    pub metadata: Option<String>,
    pub created_at: String,
}

/// Get a value from plugin storage
pub fn get_plugin_data(
    conn: &Connection,
    plugin_id: &str,
    key: &str,
) -> Result<Option<PluginDataEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, plugin_id, key, value, value_type, created_at, updated_at 
         FROM plugin_data 
         WHERE plugin_id = ?1 AND key = ?2",
    )?;

    let result = stmt.query_row(params![plugin_id, key], |row| {
        Ok(PluginDataEntry {
            id: row.get(0)?,
            plugin_id: row.get(1)?,
            key: row.get(2)?,
            value: row.get(3)?,
            value_type: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get all data for a plugin
pub fn get_all_plugin_data(
    conn: &Connection,
    plugin_id: &str,
) -> Result<Vec<PluginDataEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, plugin_id, key, value, value_type, created_at, updated_at 
         FROM plugin_data 
         WHERE plugin_id = ?1
         ORDER BY key",
    )?;

    let entries = stmt
        .query_map(params![plugin_id], |row| {
            Ok(PluginDataEntry {
                id: row.get(0)?,
                plugin_id: row.get(1)?,
                key: row.get(2)?,
                value: row.get(3)?,
                value_type: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(entries)
}

/// Set a value in plugin storage
pub fn set_plugin_data(
    conn: &Connection,
    plugin_id: &str,
    key: &str,
    value: &str,
    value_type: &str,
) -> Result<()> {
    conn.execute(
        "INSERT INTO plugin_data (plugin_id, key, value, value_type, updated_at)
         VALUES (?1, ?2, ?3, ?4, datetime('now'))
         ON CONFLICT(plugin_id, key) 
         DO UPDATE SET value = ?3, value_type = ?4, updated_at = datetime('now')",
        params![plugin_id, key, value, value_type],
    )?;
    Ok(())
}

/// Remove a value from plugin storage
pub fn remove_plugin_data(conn: &Connection, plugin_id: &str, key: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM plugin_data WHERE plugin_id = ?1 AND key = ?2",
        params![plugin_id, key],
    )?;
    Ok(())
}

/// Clear all data for a plugin
pub fn clear_plugin_data(conn: &Connection, plugin_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM plugin_data WHERE plugin_id = ?1",
        params![plugin_id],
    )?;
    Ok(())
}

/// Get plugin metadata
pub fn get_plugin_metadata(
    conn: &Connection,
    plugin_id: &str,
) -> Result<Option<PluginMetadata>> {
    let mut stmt = conn.prepare(
        "SELECT plugin_id, name, version, enabled, installed_at, updated_at, first_party, settings
         FROM plugin_metadata 
         WHERE plugin_id = ?1",
    )?;

    let result = stmt.query_row(params![plugin_id], |row| {
        Ok(PluginMetadata {
            plugin_id: row.get(0)?,
            name: row.get(1)?,
            version: row.get(2)?,
            enabled: row.get::<_, i32>(3)? != 0,
            installed_at: row.get(4)?,
            updated_at: row.get(5)?,
            first_party: row.get::<_, i32>(6)? != 0,
            settings: row.get(7)?,
        })
    });

    match result {
        Ok(metadata) => Ok(Some(metadata)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get all plugin metadata
pub fn get_all_plugin_metadata(conn: &Connection) -> Result<Vec<PluginMetadata>> {
    let mut stmt = conn.prepare(
        "SELECT plugin_id, name, version, enabled, installed_at, updated_at, first_party, settings
         FROM plugin_metadata 
         ORDER BY name",
    )?;

    let metadata = stmt
        .query_map([], |row| {
            Ok(PluginMetadata {
                plugin_id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                enabled: row.get::<_, i32>(3)? != 0,
                installed_at: row.get(4)?,
                updated_at: row.get(5)?,
                first_party: row.get::<_, i32>(6)? != 0,
                settings: row.get(7)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(metadata)
}

/// Save or update plugin metadata
pub fn save_plugin_metadata(conn: &Connection, metadata: &PluginMetadata) -> Result<()> {
    conn.execute(
        "INSERT INTO plugin_metadata (plugin_id, name, version, enabled, installed_at, updated_at, first_party, settings)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(plugin_id) 
         DO UPDATE SET 
            name = ?2, 
            version = ?3, 
            enabled = ?4, 
            updated_at = ?6, 
            first_party = ?7, 
            settings = ?8",
        params![
            metadata.plugin_id,
            metadata.name,
            metadata.version,
            if metadata.enabled { 1 } else { 0 },
            metadata.installed_at,
            metadata.updated_at,
            if metadata.first_party { 1 } else { 0 },
            metadata.settings,
        ],
    )?;
    Ok(())
}

/// Delete plugin metadata
pub fn delete_plugin_metadata(conn: &Connection, plugin_id: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM plugin_metadata WHERE plugin_id = ?1",
        params![plugin_id],
    )?;
    Ok(())
}

/// Add a log entry for a plugin
pub fn add_plugin_log(
    conn: &Connection,
    plugin_id: &str,
    level: &str,
    message: &str,
    metadata: Option<&str>,
) -> Result<i64> {
    conn.execute(
        "INSERT INTO plugin_logs (plugin_id, level, message, metadata)
         VALUES (?1, ?2, ?3, ?4)",
        params![plugin_id, level, message, metadata],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Get logs for a plugin
pub fn get_plugin_logs(
    conn: &Connection,
    plugin_id: &str,
    limit: Option<i64>,
) -> Result<Vec<PluginLog>> {
    let query = if let Some(limit) = limit {
        format!(
            "SELECT id, plugin_id, level, message, metadata, created_at 
             FROM plugin_logs 
             WHERE plugin_id = ?1
             ORDER BY created_at DESC
             LIMIT {}",
            limit
        )
    } else {
        "SELECT id, plugin_id, level, message, metadata, created_at 
         FROM plugin_logs 
         WHERE plugin_id = ?1
         ORDER BY created_at DESC"
            .to_string()
    };

    let mut stmt = conn.prepare(&query)?;

    let logs = stmt
        .query_map(params![plugin_id], |row| {
            Ok(PluginLog {
                id: row.get(0)?,
                plugin_id: row.get(1)?,
                level: row.get(2)?,
                message: row.get(3)?,
                metadata: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>>>()?;

    Ok(logs)
}

/// Clear old logs (keep only last N days)
pub fn clear_old_plugin_logs(conn: &Connection, days: i64) -> Result<usize> {
    let deleted = conn.execute(
        "DELETE FROM plugin_logs 
         WHERE created_at < datetime('now', ?1)",
        params![format!("-{} days", days)],
    )?;
    Ok(deleted)
}
