use super::get_connection;
use rusqlite::{Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Table {
    pub name: String,
    pub rowCount: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    #[serde(rename = "type")]
    pub col_type: String,
    pub nullable: bool,
    pub primaryKey: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    pub table: String,
    pub columns: Vec<ColumnInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<std::collections::HashMap<String, serde_json::Value>>,
    pub rowCount: usize,
    pub executionTime: u128,
}

/// List all tables in the database with their row counts
pub fn list_tables() -> Result<Vec<Table>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master 
             WHERE type='table' AND name NOT LIKE 'sqlite_%'
             ORDER BY name",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let tables = stmt
        .query_map([], |row| {
            let table_name: String = row.get(0)?;
            Ok(table_name)
        })
        .map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Query error: {}", e))?;

    let mut result = Vec::new();

    for table_name in tables {
        let count_query = format!("SELECT COUNT(*) FROM [{}]", table_name);
        let row_count: i64 = conn
            .query_row(&count_query, [], |row| row.get(0))
            .unwrap_or(0);

        result.push(Table {
            name: table_name,
            rowCount: row_count,
        });
    }

    Ok(result)
}

/// Get the schema of a specific table
pub fn get_table_schema(table_name: &str) -> Result<TableSchema, String> {
    let conn = get_connection()?;

    // Validate table name to prevent SQL injection
    let valid_name = table_name.chars().all(|c| c.is_alphanumeric() || c == '_');
    if !valid_name {
        return Err("Invalid table name".to_string());
    }

    let pragma_query = format!("PRAGMA table_info([{}])", table_name);
    let mut stmt = conn
        .prepare(&pragma_query)
        .map_err(|e| format!("Pragma error: {}", e))?;

    let columns = stmt
        .query_map([], |row| {
            Ok(ColumnInfo {
                name: row.get::<_, String>(1)?,
                col_type: row.get::<_, String>(2)?,
                nullable: row.get::<_, i32>(3)? == 0,
                primaryKey: row.get::<_, i32>(5)? != 0,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Query error: {}", e))?;

    Ok(TableSchema {
        table: table_name.to_string(),
        columns,
    })
}

/// Execute a SQL query and return results
pub fn execute_query(query: &str) -> Result<QueryResult, String> {
    let conn = get_connection()?;
    let start = Instant::now();

    // Trim and validate query
    let query = query.trim();
    if query.is_empty() {
        return Err("Query cannot be empty".to_string());
    }

    // Check if it's a SELECT query (read-only for safety)
    let query_upper = query.to_uppercase();
    if !query_upper.starts_with("SELECT") && !query_upper.starts_with("PRAGMA") {
        return Err("Only SELECT and PRAGMA queries are allowed".to_string());
    }

    let mut stmt = conn
        .prepare(query)
        .map_err(|e| format!("SQL Syntax Error: {}", e))?;

    let col_names = stmt
        .column_names()
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>();

    let mut rows = Vec::new();

    let mut rows_stmt = stmt
        .query([])
        .map_err(|e| format!("Query execution error: {}", e))?;

    while let Some(row) = rows_stmt
        .next()
        .map_err(|e| format!("Row fetch error: {}", e))?
    {
        let mut row_map = std::collections::HashMap::new();

        for (i, col_name) in col_names.iter().enumerate() {
            let value = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Integer(v)) => {
                    serde_json::Value::Number(serde_json::Number::from(v))
                }
                Ok(rusqlite::types::ValueRef::Real(v)) => {
                    serde_json::json!(v)
                }
                Ok(rusqlite::types::ValueRef::Text(bytes)) => {
                    let s = String::from_utf8_lossy(bytes).to_string();
                    serde_json::Value::String(s)
                }
                Ok(rusqlite::types::ValueRef::Blob(bytes)) => {
                    serde_json::Value::String(format!("<BLOB: {} bytes>", bytes.len()))
                }
                Ok(rusqlite::types::ValueRef::Null) => serde_json::Value::Null,
                Err(_) => serde_json::Value::Null,
            };
            row_map.insert(col_name.clone(), value);
        }

        rows.push(row_map);
    }

    let execution_time = start.elapsed().as_millis();

    Ok(QueryResult {
        columns: col_names,
        rowCount: rows.len(),
        rows,
        executionTime: execution_time,
    })
}
