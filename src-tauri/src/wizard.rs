use crate::db::config;
use crate::db::users::{self, CreateUserInput, User};
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

    // Eliminar todas las configuraciones excepto la contraseña del sistema
    let conn = crate::db::get_connection()?;

    conn.execute("DELETE FROM users", [])
        .map_err(|e| format!("Error eliminando usuarios: {}", e))?;

    conn.execute("DELETE FROM app_config WHERE key != 'system_password'", [])
        .map_err(|e| format!("Error limpiando configuración: {}", e))?;

    Ok(())
}
