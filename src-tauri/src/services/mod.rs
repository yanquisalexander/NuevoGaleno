// Domain Services Layer
// This layer contains all business logic and is independent of Tauri and HTTP adapters
// Both tauri::command and HTTP routes should call these services

pub mod patients;

use std::sync::Arc;

/// Service result type
pub type ServiceResult<T> = Result<T, ServiceError>;

/// Service error types
#[derive(Debug, Clone)]
pub enum ServiceError {
    NotFound(String),
    ValidationError(String),
    DatabaseError(String),
    Unauthorized(String),
}

impl std::fmt::Display for ServiceError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ServiceError::NotFound(msg) => write!(f, "Not found: {}", msg),
            ServiceError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ServiceError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            ServiceError::Unauthorized(msg) => write!(f, "Unauthorized: {}", msg),
        }
    }
}

impl From<ServiceError> for String {
    fn from(error: ServiceError) -> Self {
        error.to_string()
    }
}

/// Trait for all domain services
pub trait DomainService: Send + Sync {
    fn name(&self) -> &'static str;
}
