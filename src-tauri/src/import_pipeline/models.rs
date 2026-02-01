// DTOs (Data Transfer Objects) - Estructuras intermedias entre Paradox y SQLite
// Estas estructuras representan los datos normalizados antes de persistir

use serde::{Deserialize, Serialize};

// ═══════════════════════════════════════════════════════════════════════════
// MODELOS INTERMEDIOS (DTOs)
// ═══════════════════════════════════════════════════════════════════════════

/// DTO temporal de paciente antes de persistir
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientDto {
    // Identificadores
    pub temp_id: String, // ID temporal para tracking durante importación
    pub legacy_id: Option<String>, // ID original de Galeno 2000

    // Datos personales
    pub first_name: String,
    pub last_name: String,
    pub document_type: Option<String>, // DNI, Pasaporte, etc.
    pub document_number: Option<String>,

    // Contacto
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub postal_code: Option<String>,

    // Datos médicos
    pub birth_date: Option<String>, // ISO 8601 format
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub medical_notes: Option<String>,

    // Metadatos de importación
    pub created_at_legacy: Option<String>,
    pub last_updated_legacy: Option<String>,

    // Datos crudos para debugging
    pub raw_data: serde_json::Value,

    // Relaciones
    pub treatments: Vec<TreatmentDto>,
}

impl PatientDto {
    pub fn new_with_temp_id() -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros();

        Self {
            temp_id: format!("PAT_{}", ts),
            legacy_id: None,
            first_name: String::new(),
            last_name: String::new(),
            document_type: None,
            document_number: None,
            phone: None,
            email: None,
            address: None,
            city: None,
            postal_code: None,
            birth_date: None,
            gender: None,
            blood_type: None,
            allergies: None,
            medical_notes: None,
            created_at_legacy: None,
            last_updated_legacy: None,
            raw_data: serde_json::json!({}),
            treatments: Vec::new(),
        }
    }

    /// Genera un nombre completo limpio
    pub fn full_name(&self) -> String {
        format!("{} {}", self.first_name.trim(), self.last_name.trim())
            .trim()
            .to_string()
    }

    /// Verifica si el paciente tiene datos mínimos válidos
    pub fn has_minimum_data(&self) -> bool {
        !self.first_name.trim().is_empty() && !self.last_name.trim().is_empty()
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRATAMIENTO DTO
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreatmentDto {
    pub temp_id: String,
    pub legacy_id: Option<String>,
    pub patient_temp_id: String, // Referencia al paciente padre

    // Datos del tratamiento
    pub name: String,
    pub description: Option<String>,
    pub tooth_number: Option<String>, // Pieza dental (ej: "18", "3.6")
    pub sector: Option<String>,       // Sector odontológico

    // Estado y costos
    pub status: TreatmentStatus,
    pub total_cost: f64,
    pub paid_amount: f64,
    pub balance: f64, // Saldo adeudado

    // Fechas
    pub planned_date: Option<String>,
    pub started_date: Option<String>,
    pub completed_date: Option<String>,

    // Metadatos
    pub created_at_legacy: Option<String>,
    pub notes: Option<String>,
    pub raw_data: serde_json::Value,

    // Relaciones
    pub payments: Vec<PaymentDto>,
}

impl TreatmentDto {
    pub fn new_with_temp_id(patient_temp_id: String) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros();

        Self {
            temp_id: format!("TRX_{}", ts),
            legacy_id: None,
            patient_temp_id,
            name: String::new(),
            description: None,
            tooth_number: None,
            sector: None,
            status: TreatmentStatus::Pending,
            total_cost: 0.0,
            paid_amount: 0.0,
            balance: 0.0,
            planned_date: None,
            started_date: None,
            completed_date: None,
            created_at_legacy: None,
            notes: None,
            raw_data: serde_json::json!({}),
            payments: Vec::new(),
        }
    }

    /// Recalcula el balance automáticamente
    pub fn recalculate_balance(&mut self) {
        self.balance = self.total_cost - self.paid_amount;
    }

    /// Verifica si los pagos cuadran con el total
    #[allow(dead_code)]
    pub fn payments_match_total(&self) -> bool {
        let payments_sum: f64 = self.payments.iter().map(|p| p.amount).sum();
        (payments_sum - self.paid_amount).abs() < 0.01 // Tolerancia de 1 centavo
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TreatmentStatus {
    Pending,    // Por hacer
    InProgress, // En tratamiento
    Completed,  // Terminado
    Cancelled,  // Cancelado
    Unknown,    // Estado no reconocido del legacy
}

impl TreatmentStatus {
    /// Convierte valores legacy a estados conocidos
    pub fn from_legacy_value(value: &str) -> Self {
        let v = value.trim().to_lowercase();
        match v.as_str() {
            "pendiente" | "por hacer" | "pending" | "0" => Self::Pending,
            "en tratamiento" | "en proceso" | "in progress" | "1" => Self::InProgress,
            "terminado" | "finalizado" | "completed" | "2" => Self::Completed,
            "cancelado" | "cancelled" | "3" => Self::Cancelled,
            _ => Self::Unknown,
        }
    }

    pub fn to_db_value(&self) -> &str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Cancelled => "cancelled",
            Self::Unknown => "unknown",
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGO DTO
// ═══════════════════════════════════════════════════════════════════════════

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentDto {
    pub temp_id: String,
    pub legacy_id: Option<String>,
    pub treatment_temp_id: String, // Referencia al tratamiento padre

    pub amount: f64,
    pub payment_date: Option<String>,   // ISO 8601
    pub payment_method: Option<String>, // Efectivo, Tarjeta, Transferencia
    pub notes: Option<String>,

    pub created_at_legacy: Option<String>,
    pub raw_data: serde_json::Value,
}

impl PaymentDto {
    pub fn new_with_temp_id(treatment_temp_id: String) -> Self {
        use std::time::{SystemTime, UNIX_EPOCH};
        let ts = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_micros();

        Self {
            temp_id: format!("PAY_{}", ts),
            legacy_id: None,
            treatment_temp_id,
            amount: 0.0,
            payment_date: None,
            payment_method: None,
            notes: None,
            created_at_legacy: None,
            raw_data: serde_json::json!({}),
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DATOS RAW DE PARADOX (Entrada del pipeline)
// ═══════════════════════════════════════════════════════════════════════════

/// Estructura cruda de datos leídos directamente desde Paradox
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawParadoxData {
    pub tables: Vec<RawTable>,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawTable {
    pub file_name: String,
    pub table_name: String,
    pub fields: Vec<RawField>,
    pub rows: Vec<serde_json::Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawField {
    pub name: String,
    pub field_type: u8,
    pub size: usize,
    pub type_name: String,
}
