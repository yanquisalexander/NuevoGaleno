pub mod config;
pub mod migrations;
pub mod odontograms;
pub mod odontogram_surfaces;
pub mod path;
pub mod patients;
pub mod payments;
pub mod treatments;
pub mod treatment_catalog;
pub mod users;
pub mod appointments;
pub mod templates;

use once_cell::sync::Lazy;
use rusqlite::Connection;
use std::sync::Mutex;

// Usamos Lazy<Mutex<Option<Connection>>> para thread-safety
#[allow(dead_code)]
static DB: Lazy<Mutex<Option<Connection>>> = Lazy::new(|| Mutex::new(None));

#[allow(dead_code)]
pub fn get_connection() -> Result<Connection, String> {
    // Abrir nueva conexión cada vez (SQLite permite múltiples lectores)
    let path = path::db_file_path()?;
    let conn = Connection::open(path).map_err(|e| format!("sqlite open err: {}", e))?;

    migrations::run_migrations(&conn)?;
    Ok(conn)
}
