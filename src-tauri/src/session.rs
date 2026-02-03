use crate::db::users::{self, User};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub user: User,
    pub login_time: String,
}

// Estado global de la sesión
static CURRENT_SESSION: Lazy<Arc<RwLock<Option<SessionInfo>>>> =
    Lazy::new(|| Arc::new(RwLock::new(None)));

/// Iniciar sesión con un usuario
pub fn start_session(user: User) -> Result<(), String> {
    let login_time = chrono::Utc::now().to_rfc3339();
    let session = SessionInfo { user, login_time };

    let mut current = CURRENT_SESSION
        .write()
        .map_err(|e| format!("Error obteniendo lock de sesión: {}", e))?;

    *current = Some(session);
    Ok(())
}

/// Cerrar sesión actual
pub fn end_session() -> Result<(), String> {
    let mut current = CURRENT_SESSION
        .write()
        .map_err(|e| format!("Error obteniendo lock de sesión: {}", e))?;

    *current = None;
    Ok(())
}

/// Obtener información de la sesión actual
pub fn get_session() -> Result<Option<SessionInfo>, String> {
    let current = CURRENT_SESSION
        .read()
        .map_err(|e| format!("Error leyendo sesión: {}", e))?;

    Ok(current.clone())
}

/// Verificar si hay una sesión activa
pub fn has_active_session() -> bool {
    CURRENT_SESSION.read().map(|s| s.is_some()).unwrap_or(false)
}

// ========== TAURI COMMANDS ==========

#[tauri::command]
pub fn login_user(username: String, password_hash: String) -> Result<User, String> {
    // Autenticar usuario
    match users::get_user_by_username(&username)? {
        Some((user, stored_hash)) => {
            if !user.active {
                return Err("Usuario inactivo".to_string());
            }

            if stored_hash != password_hash {
                return Err("Contraseña incorrecta".to_string());
            }

            // Iniciar sesión
            start_session(user.clone())?;

            Ok(user)
        }
        None => Err("Usuario no encontrado".to_string()),
    }
}

#[tauri::command]
pub fn login_with_pin(username: String, pin: String) -> Result<User, String> {
    match users::verify_user_pin(&username, &pin)? {
        Some(user) => {
            start_session(user.clone())?;
            Ok(user)
        }
        None => Err("PIN incorrecto".to_string()),
    }
}

#[tauri::command]
pub fn unlock_with_password(username: String, password_hash: String) -> Result<User, String> {
    // Reutilizamos la lógica de login
    login_user(username, password_hash)
}

#[tauri::command]
pub fn unlock_with_pin(username: String, pin: String) -> Result<User, String> {
    // Reutilizamos la lógica de login con PIN
    login_with_pin(username, pin)
}

#[tauri::command]
pub fn set_user_pin(username: String, pin: String) -> Result<(), String> {
    // Validar que el PIN tenga entre 4 y 6 dígitos
    if pin.len() < 4 || pin.len() > 6 {
        return Err("El PIN debe tener entre 4 y 6 dígitos".to_string());
    }

    if !pin.chars().all(|c| c.is_ascii_digit()) {
        return Err("El PIN debe contener solo dígitos".to_string());
    }

    users::update_user_pin(&username, Some(&pin))
}

#[tauri::command]
pub fn remove_user_pin(username: String) -> Result<(), String> {
    users::update_user_pin(&username, None)
}

#[tauri::command]
pub fn logout_user() -> Result<(), String> {
    end_session()
}

#[tauri::command]
pub fn get_current_user() -> Result<User, String> {
    match get_session()? {
        Some(session) => Ok(session.user),
        None => Err("No hay sesión activa".to_string()),
    }
}

#[tauri::command]
pub fn get_current_session_info() -> Result<Option<SessionInfo>, String> {
    get_session()
}

#[tauri::command]
pub fn verify_session() -> Result<bool, String> {
    Ok(has_active_session())
}

#[tauri::command]
pub fn exit_application(app: tauri::AppHandle) -> Result<(), String> {
    // Cerrar sesión antes de salir
    end_session().ok();

    // Salir de la aplicación
    app.exit(0);
    Ok(())
}

#[tauri::command]
pub fn get_session_duration() -> Result<Option<i64>, String> {
    match get_session()? {
        Some(session) => {
            let login_time = chrono::DateTime::parse_from_rfc3339(&session.login_time)
                .map_err(|e| format!("Error parseando fecha: {}", e))?;
            let now = chrono::Utc::now();
            let duration = now.signed_duration_since(login_time);
            Ok(Some(duration.num_seconds()))
        }
        None => Ok(None),
    }
}
