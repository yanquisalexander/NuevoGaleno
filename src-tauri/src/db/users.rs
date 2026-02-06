use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i64,
    pub username: String,
    pub name: String,
    pub role: String,
    pub pin: Option<String>,
    pub active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateUserInput {
    pub username: String,
    pub password_hash: String,
    pub name: String,
    pub role: String,
}

pub fn create_user(input: CreateUserInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO users (username, password_hash, name, role, created_at, updated_at, active)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
        params![
            input.username,
            input.password_hash,
            input.name,
            input.role,
            &now,
            &now
        ],
    )
    .map_err(|e| format!("Error creando usuario: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_user_by_username(username: &str) -> Result<Option<(User, String)>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT id, username, password_hash, pin, name, role, active, created_at FROM users WHERE username = ?1")
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![username], |row| {
        Ok((
            User {
                id: row.get(0)?,
                username: row.get(1)?,
                name: row.get(4)?,
                role: row.get(5)?,
                pin: row.get(3).ok(),
                active: row.get::<_, i32>(6)? == 1,
                created_at: row.get(7)?,
            },
            row.get::<_, String>(2)?, // password_hash
        ))
    });

    match result {
        Ok(data) => Ok(Some(data)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error buscando usuario: {}", e)),
    }
}

pub fn list_users() -> Result<Vec<User>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT id, username, name, role, pin, active, created_at FROM users ORDER BY created_at DESC")
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let users = stmt
        .query_map([], |row| {
            Ok(User {
                id: row.get(0)?,
                username: row.get(1)?,
                name: row.get(2)?,
                role: row.get(3)?,
                pin: row.get(4).ok(),
                active: row.get::<_, i32>(5)? == 1,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Error listando usuarios: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error procesando usuarios: {}", e))?;

    Ok(users)
}

pub fn update_user_password(username: &str, new_password_hash: &str) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    let updated = conn
        .execute(
            "UPDATE users SET password_hash = ?1, updated_at = ?2 WHERE username = ?3",
            params![new_password_hash, &now, username],
        )
        .map_err(|e| format!("Error actualizando contraseña: {}", e))?;

    if updated == 0 {
        return Err("Usuario no encontrado".to_string());
    }

    Ok(())
}

pub fn delete_user(username: &str) -> Result<(), String> {
    let conn = get_connection()?;

    let deleted = conn
        .execute("DELETE FROM users WHERE username = ?1", params![username])
        .map_err(|e| format!("Error eliminando usuario: {}", e))?;

    if deleted == 0 {
        return Err("Usuario no encontrado".to_string());
    }

    Ok(())
}

pub fn update_user_pin(username: &str, new_pin: Option<&str>) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    let updated = conn
        .execute(
            "UPDATE users SET pin = ?1, updated_at = ?2 WHERE username = ?3",
            params![new_pin, &now, username],
        )
        .map_err(|e| format!("Error actualizando PIN: {}", e))?;

    if updated == 0 {
        return Err("Usuario no encontrado".to_string());
    }

    Ok(())
}

pub fn verify_user_pin(username: &str, pin: &str) -> Result<Option<User>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare("SELECT id, username, name, role, pin, active, created_at FROM users WHERE username = ?1")
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![username], |row| {
        Ok(User {
            id: row.get(0)?,
            username: row.get(1)?,
            name: row.get(2)?,
            role: row.get(3)?,
            pin: row.get(4).ok(),
            active: row.get::<_, i32>(5)? == 1,
            created_at: row.get(6)?,
        })
    });

    match result {
        Ok(user) => {
            if !user.active {
                return Err("Usuario inactivo".to_string());
            }

            match &user.pin {
                Some(stored_pin) if stored_pin == pin => Ok(Some(user)),
                Some(_) => Err("PIN incorrecto".to_string()),
                None => Err("Usuario no tiene PIN configurado".to_string()),
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Err("Usuario no encontrado".to_string()),
        Err(e) => Err(format!("Error verificando PIN: {}", e)),
    }
}
