use crate::db::config;
use crate::db::users::{self, CreateUserInput, User};
use chrono::Utc;
use serde::Serialize;
use std::path::PathBuf;

pub fn db_file_path() -> Result<PathBuf, String> {
    crate::db::path::db_file_path()
}

#[tauri::command]
pub fn init_app_db() -> Result<String, String> {
    let db_path = db_file_path()?;
    let conn =
        rusqlite::Connection::open(&db_path).map_err(|e| format!("sqlite open err: {}", e))?;
    crate::db::migrations::run_migrations(&conn)?;
    Ok(db_path.to_string_lossy().to_string())
}

// ========== STARTUP SEQUENCE ==========

#[derive(Debug, Serialize)]
pub struct StartupContext {
    /// Versión actual de la aplicación
    pub app_version: String,
    /// Versión anterior (si la app fue actualizada desde la última ejecución)
    pub updated_from: Option<String>,
    /// Si la app fue actualizada en este inicio
    pub was_updated: bool,
    /// Cuántas migraciones de base de datos se aplicaron
    pub migrations_applied: i32,
    /// Versión actual del esquema de DB
    pub schema_version: i32,
    /// Cuántos directorios temporales de importación se limpiaron
    pub temp_dirs_cleaned: u32,
    /// Espacio liberado aproximado en bytes
    pub bytes_freed: u64,
}

/// Ejecuta la secuencia de inicio completa:
///  1. Aplica migraciones de DB
///  2. Rastrea versión de la app (detecta actualizaciones)
///  3. Limpia directorios temporales de importaciones anteriores
/// Retorna contexto para mostrarlo en el splash screen.
#[tauri::command]
pub fn run_startup_sequence() -> Result<StartupContext, String> {
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    // 1. Abrir DB y correr migraciones
    let db_path = db_file_path()?;
    let conn =
        rusqlite::Connection::open(&db_path).map_err(|e| format!("sqlite open err: {}", e))?;
    let migrations_applied = crate::db::migrations::run_migrations(&conn)?;
    crate::db::migrations::ensure_legacy_columns(&conn)?;

    // Versión actual del esquema
    let schema_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 2. Detectar actualizaciones comparando con la última versión registrada
    let prev_version = config::get_config("last_started_version")?;
    let was_updated = match &prev_version {
        Some(prev) => prev != &app_version,
        None => false, // primer arranque
    };

    // Registrar la versión anterior si hubo actualización
    let updated_from = if was_updated { prev_version } else { None };
    if was_updated {
        let prev_str = updated_from.as_deref().unwrap_or("desconocida");
        config::set_config("updated_from", prev_str)?;
    }

    // Actualizar last_started_version y last_updated
    config::set_config("last_started_version", &app_version)?;
    if migrations_applied > 0 || was_updated {
        config::set_config("last_updated", &Utc::now().to_rfc3339())?;
    }

    // 3. Limpiar directorios temporales de importaciones previas
    let (temp_dirs_cleaned, bytes_freed) = cleanup_import_temp_dirs();

    Ok(StartupContext {
        app_version,
        updated_from,
        was_updated,
        migrations_applied,
        schema_version,
        temp_dirs_cleaned,
        bytes_freed,
    })
}

/// Elimina los directorios temporales creados por el extractor de archivos .gln.
/// El patrón es: <temp_dir>/nuevogaleno_import_<timestamp>
/// Retorna (cantidad_de_dirs, bytes_liberados).
fn cleanup_import_temp_dirs() -> (u32, u64) {
    let temp = std::env::temp_dir();
    let mut cleaned = 0u32;
    let mut freed = 0u64;

    let entries = match std::fs::read_dir(&temp) {
        Ok(e) => e,
        Err(_) => return (0, 0),
    };

    for entry in entries.flatten() {
        let name = entry.file_name();
        let name_str = name.to_string_lossy();
        if name_str.starts_with("nuevogaleno_import_") {
            if let Ok(meta) = entry.metadata() {
                if meta.is_dir() {
                    freed += dir_size(&entry.path());
                    if std::fs::remove_dir_all(entry.path()).is_ok() {
                        cleaned += 1;
                    }
                }
            }
        }
    }

    (cleaned, freed)
}

/// Calcula el tamaño total de un directorio de forma recursiva.
fn dir_size(path: &std::path::Path) -> u64 {
    let mut total = 0u64;
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                total += dir_size(&p);
            } else if let Ok(m) = entry.metadata() {
                total += m.len();
            }
        }
    }
    total
}

#[tauri::command]
pub fn set_config(key: String, value: String) -> Result<(), String> {
    config::set_config(&key, &value)
}

#[tauri::command]
pub fn get_config(key: String) -> Result<Option<String>, String> {
    config::get_config(&key)
}

// ========== USER MANAGEMENT ==========

#[tauri::command]
pub fn create_user(
    username: String,
    password_hash: String,
    name: String,
    role: String,
) -> Result<i64, String> {
    users::create_user(CreateUserInput {
        username,
        password_hash,
        name,
        role,
    })
}

#[tauri::command]
pub fn authenticate_user(username: String, password_hash: String) -> Result<Option<User>, String> {
    match users::get_user_by_username(&username)? {
        Some((user, stored_hash)) => {
            if !user.active {
                return Err("Usuario inactivo".to_string());
            }

            if stored_hash == password_hash {
                Ok(Some(user))
            } else {
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn list_users() -> Result<Vec<User>, String> {
    users::list_users()
}

#[tauri::command]
pub fn update_user_password(username: String, new_password_hash: String) -> Result<(), String> {
    users::update_user_password(&username, &new_password_hash)
}

#[tauri::command]
pub fn delete_user(username: String) -> Result<(), String> {
    users::delete_user(&username)
}

#[tauri::command]
pub fn verify_system_password(password_hash: String) -> Result<bool, String> {
    match config::get_config("system_password")? {
        Some(stored_hash) => Ok(stored_hash == password_hash),
        None => Err("Contraseña del sistema no configurada".to_string()),
    }
}

#[tauri::command]
pub fn set_system_password(password_hash: String) -> Result<(), String> {
    config::set_config("system_password", &password_hash)
}

#[tauri::command]
pub fn wipe_system(system_password_hash: String) -> Result<(), String> {
    // Verificar contraseña del sistema
    if !verify_system_password(system_password_hash)? {
        return Err("Contraseña del sistema incorrecta".to_string());
    }

    // Eliminar todos los datos de Galeno (usuarios, configuraciones, etc.)
    let conn = crate::db::get_connection()?;

    conn.execute("DELETE FROM users", [])
        .map_err(|e| format!("Error eliminando usuarios: {}", e))?;

    conn.execute("DELETE FROM app_config WHERE key != 'system_password'", [])
        .map_err(|e| format!("Error limpiando configuración: {}", e))?;

    Ok(())
}
