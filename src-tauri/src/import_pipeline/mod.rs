// Pipeline modular de importación desde Paradox a SQLite
// Arquitectura: Lectura → Transformación → Validación → Previsualización → Persistencia

pub mod commands;
pub mod models;
pub mod persister;
pub mod previewer;
pub mod reader;
pub mod transformer;
pub mod validator;

use serde::{Deserialize, Serialize};

/// Estado general del pipeline de importación
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportSession {
    pub session_id: String,
    pub source_path: String,
    pub status: SessionStatus,
    pub started_at: String,
    pub completed_at: Option<String>,
    pub statistics: ImportStatistics,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SessionStatus {
    Initiated,
    Reading,
    Transforming,
    Validating,
    PreviewReady,
    Confirmed,
    Persisting,
    Completed,
    Failed(String),
    RolledBack,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImportStatistics {
    pub patients_found: usize,
    pub patients_valid: usize,
    pub patients_with_warnings: usize,
    pub patients_invalid: usize,

    pub treatments_found: usize,
    pub treatments_valid: usize,
    pub treatments_with_warnings: usize,
    pub treatments_invalid: usize,

    pub payments_found: usize,
    pub payments_valid: usize,
    pub payments_with_warnings: usize,
    pub payments_invalid: usize,
}

/// Contexto de errores y advertencias del pipeline
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationIssue {
    pub severity: IssueSeverity,
    pub entity_type: String,       // "patient", "treatment", "payment"
    pub entity_id: Option<String>, // ID temporal del DTO
    pub field: String,
    pub message: String,
    pub raw_value: Option<String>,
    pub suggested_fix: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum IssueSeverity {
    Info,     // No impide importar, solo informativo
    Warning,  // Puede importarse pero requiere revisión
    Error,    // Impide importar este registro
    Critical, // Impide importar toda la sesión
}

impl ValidationIssue {
    pub fn info(entity_type: &str, field: &str, message: String) -> Self {
        Self {
            severity: IssueSeverity::Info,
            entity_type: entity_type.to_string(),
            entity_id: None,
            field: field.to_string(),
            message,
            raw_value: None,
            suggested_fix: None,
        }
    }

    pub fn warning(entity_type: &str, entity_id: &str, field: &str, message: String) -> Self {
        Self {
            severity: IssueSeverity::Warning,
            entity_type: entity_type.to_string(),
            entity_id: Some(entity_id.to_string()),
            field: field.to_string(),
            message,
            raw_value: None,
            suggested_fix: None,
        }
    }

    pub fn error(entity_type: &str, entity_id: &str, field: &str, message: String) -> Self {
        Self {
            severity: IssueSeverity::Error,
            entity_type: entity_type.to_string(),
            entity_id: Some(entity_id.to_string()),
            field: field.to_string(),
            message,
            raw_value: None,
            suggested_fix: None,
        }
    }
}
