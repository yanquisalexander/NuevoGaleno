// Node Configuration Persistence
// Stores and retrieves node configuration from the database

use super::{ClientConfig, HostConfig, NodeConfig, NodeMode};
use crate::db;
use rusqlite::{params, Connection};

const CONFIG_KEY_NODE_MODE: &str = "node.mode";
const CONFIG_KEY_NODE_NAME: &str = "node.name";
const CONFIG_KEY_HOST_PORT: &str = "node.host.api_port";
const CONFIG_KEY_HOST_TOKEN: &str = "node.host.api_token";
const CONFIG_KEY_HOST_CORS: &str = "node.host.enable_cors";
const CONFIG_KEY_CLIENT_URL: &str = "node.client.remote_url";
const CONFIG_KEY_CLIENT_TOKEN: &str = "node.client.auth_token";

/// Save node configuration to database
pub fn save_node_config(config: &NodeConfig) -> Result<(), String> {
    let conn = db::get_connection()?;

    // Save mode
    save_config_value(&conn, CONFIG_KEY_NODE_MODE, &config.mode.to_string())?;

    // Save node name
    save_config_value(&conn, CONFIG_KEY_NODE_NAME, &config.node_name)?;

    // Save host config if present
    if let Some(host_config) = &config.host_config {
        save_config_value(&conn, CONFIG_KEY_HOST_PORT, &host_config.api_port.to_string())?;
        save_config_value(&conn, CONFIG_KEY_HOST_TOKEN, &host_config.api_token)?;
        save_config_value(
            &conn,
            CONFIG_KEY_HOST_CORS,
            &host_config.enable_cors.to_string(),
        )?;
    }

    // Save client config if present
    if let Some(client_config) = &config.client_config {
        save_config_value(&conn, CONFIG_KEY_CLIENT_URL, &client_config.remote_url)?;
        save_config_value(&conn, CONFIG_KEY_CLIENT_TOKEN, &client_config.auth_token)?;
    }

    Ok(())
}

/// Load node configuration from database
pub fn load_node_config() -> Result<NodeConfig, String> {
    let conn = db::get_connection()?;

    let mode = get_config_value(&conn, CONFIG_KEY_NODE_MODE)?
        .and_then(|s| match s.as_str() {
            "standalone" => Some(NodeMode::Standalone),
            "host" => Some(NodeMode::Host),
            "client" => Some(NodeMode::Client),
            _ => None,
        })
        .unwrap_or_default();

    let node_name = get_config_value(&conn, CONFIG_KEY_NODE_NAME)?
        .unwrap_or_else(|| NodeConfig::default().node_name);

    let host_config = if mode == NodeMode::Host {
        Some(HostConfig {
            api_port: get_config_value(&conn, CONFIG_KEY_HOST_PORT)?
                .and_then(|s| s.parse().ok())
                .unwrap_or(3000),
            api_token: get_config_value(&conn, CONFIG_KEY_HOST_TOKEN)?.unwrap_or_default(),
            enable_cors: get_config_value(&conn, CONFIG_KEY_HOST_CORS)?
                .and_then(|s| s.parse().ok())
                .unwrap_or(true),
        })
    } else {
        None
    };

    let client_config = if mode == NodeMode::Client {
        Some(ClientConfig {
            remote_url: get_config_value(&conn, CONFIG_KEY_CLIENT_URL)?.unwrap_or_default(),
            auth_token: get_config_value(&conn, CONFIG_KEY_CLIENT_TOKEN)?.unwrap_or_default(),
        })
    } else {
        None
    };

    Ok(NodeConfig {
        mode,
        node_name,
        host_config,
        client_config,
    })
}

fn save_config_value(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR REPLACE INTO config (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|e| format!("Error saving config value: {}", e))?;
    Ok(())
}

fn get_config_value(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare("SELECT value FROM config WHERE key = ?1")
        .map_err(|e| format!("Error preparing query: {}", e))?;

    let result = stmt
        .query_row(params![key], |row| row.get(0))
        .optional()
        .map_err(|e| format!("Error querying config: {}", e))?;

    Ok(result)
}
