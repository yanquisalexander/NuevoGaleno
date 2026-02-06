// Authentication Service
// Handles user authentication and JWT token generation

use crate::db::{config, users::{self, User}};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};

/// JWT expiration time (24 hours)
const JWT_EXPIRATION_HOURS: u64 = 24;

/// Fallback JWT secret if system password is not configured
const FALLBACK_JWT_SECRET: &str = "NUEVO_GALENO_DEFAULT_SECRET_CHANGE_SYSTEM_PASSWORD";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // Username
    pub user_id: i64,     // User ID
    pub role: String,     // User role
    pub exp: u64,         // Expiration time
    pub iat: u64,         // Issued at
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
}

/// Authentication service
pub struct AuthService;

impl AuthService {
    pub fn new() -> Self {
        Self
    }

    /// Authenticate user with username and password
    /// Returns JWT token and user info
    pub fn login(&self, username: String, password: String) -> Result<LoginResponse, String> {
        // Hash the password
        let password_hash = Self::hash_password(&password);

        // Get user from database
        let (user, stored_hash) = users::get_user_by_username(&username)?
            .ok_or_else(|| "Usuario no encontrado".to_string())?;

        // Verify user is active
        if !user.active {
            return Err("Usuario inactivo".to_string());
        }

        // Verify password
        if stored_hash != password_hash {
            return Err("Contraseña incorrecta".to_string());
        }

        // Generate JWT token
        let token = Self::generate_jwt(&user)?;

        Ok(LoginResponse { token, user })
    }

    /// Verify JWT token and return user info
    pub fn verify_token(&self, token: &str) -> Result<User, String> {
        let claims = Self::decode_jwt(token)?;

        // Get user from database to ensure it still exists and is active
        let (user, _) = users::get_user_by_username(&claims.sub)?
            .ok_or_else(|| "Usuario no encontrado".to_string())?;

        if !user.active {
            return Err("Usuario inactivo".to_string());
        }

        Ok(user)
    }

    /// Get JWT secret from system password
    /// Uses system password as secret for enhanced security
    /// Falls back to default secret if system password is not configured
    fn get_jwt_secret() -> String {
        config::get_config("system_password")
            .ok()
            .flatten()
            .unwrap_or_else(|| FALLBACK_JWT_SECRET.to_string())
    }

    /// Hash password using SHA256
    fn hash_password(password: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(password.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Generate JWT token for user
    fn generate_jwt(user: &User) -> Result<String, String> {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| format!("Error obteniendo tiempo: {}", e))?
            .as_secs();

        let claims = Claims {
            sub: user.username.clone(),
            user_id: user.id,
            role: user.role.clone(),
            exp: now + (JWT_EXPIRATION_HOURS * 3600),
            iat: now,
        };

        let secret = Self::get_jwt_secret();
        
        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| format!("Error generando token: {}", e))
    }

    /// Decode and validate JWT token
    fn decode_jwt(token: &str) -> Result<Claims, String> {
        let secret = Self::get_jwt_secret();
        let validation = Validation::default();

        decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        )
        .map(|data| data.claims)
        .map_err(|e| format!("Token inválido: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_password() {
        let hash1 = AuthService::hash_password("test123");
        let hash2 = AuthService::hash_password("test123");
        assert_eq!(hash1, hash2);

        let hash3 = AuthService::hash_password("different");
        assert_ne!(hash1, hash3);
    }
}
