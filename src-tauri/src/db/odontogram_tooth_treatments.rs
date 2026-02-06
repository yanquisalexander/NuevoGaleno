use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

// ============================================================================
// Tratamientos a nivel de diente completo (sin superficie específica)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OdontogramToothTreatment {
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub is_active: bool,
    pub applied_date: String,
    pub created_at: String,
    pub updated_at: String,
    pub treatment_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddToothTreatmentInput {
    pub patient_id: i64,
    pub tooth_number: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub applied_date: Option<String>,
    pub treatment_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToothTreatmentHistoryEntry {
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub action: String,
    pub applied_date: String,
    pub recorded_at: String,
}

/// Obtener todos los tratamientos activos de un diente específico
pub fn get_tooth_treatments(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Vec<OdontogramToothTreatment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_tooth_treatments
             WHERE patient_id = ?1 AND tooth_number = ?2 AND is_active = 1
             ORDER BY applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let treatments = stmt
        .query_map(params![patient_id, tooth_number], |row| {
            Ok(OdontogramToothTreatment {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                treatment_catalog_id: row.get(3)?,
                treatment_catalog_item_id: row.get(4)?,
                condition: row.get(5)?,
                notes: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                applied_date: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                treatment_id: row.get(11)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(treatments)
}

/// Obtener todos los tratamientos de dientes completos de un paciente
pub fn get_tooth_treatments_by_patient(
    patient_id: i64,
) -> Result<Vec<OdontogramToothTreatment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_tooth_treatments
             WHERE patient_id = ?1 AND is_active = 1
             ORDER BY tooth_number, applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let treatments = stmt
        .query_map(params![patient_id], |row| {
            Ok(OdontogramToothTreatment {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                treatment_catalog_id: row.get(3)?,
                treatment_catalog_item_id: row.get(4)?,
                condition: row.get(5)?,
                notes: row.get(6)?,
                is_active: row.get::<_, i32>(7)? == 1,
                applied_date: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
                treatment_id: row.get(11)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(treatments)
}

/// Agregar un tratamiento a un diente completo
pub fn add_tooth_treatment(input: AddToothTreatmentInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let applied_date = input.applied_date.unwrap_or_else(|| now.clone());

    // Insertar el tratamiento
    conn.execute(
        "INSERT INTO odontogram_tooth_treatments (patient_id, tooth_number, treatment_catalog_id, 
                                                   treatment_catalog_item_id, condition, notes, 
                                                   is_active, applied_date, created_at, updated_at, treatment_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8, ?9, ?10)",
        params![
            input.patient_id,
            input.tooth_number,
            input.treatment_catalog_id,
            input.treatment_catalog_item_id,
            input.condition,
            input.notes,
            &applied_date,
            &now,
            &now,
            input.treatment_id,
        ],
    )
    .map_err(|e| format!("Error insertando tratamiento: {}", e))?;

    let treatment_id = conn.last_insert_rowid();

    // Registrar en historial
    conn.execute(
        "INSERT INTO odontogram_tooth_treatment_history (patient_id, tooth_number, treatment_catalog_id, 
                                                          treatment_catalog_item_id, condition, notes, 
                                                          action, applied_date, recorded_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'created', ?7, ?8)",
        params![
            input.patient_id,
            input.tooth_number,
            input.treatment_catalog_id,
            input.treatment_catalog_item_id,
            input.condition,
            input.notes,
            &applied_date,
            &now,
        ],
    )
    .map_err(|e| format!("Error registrando historial: {}", e))?;

    Ok(treatment_id)
}

/// Desactivar un tratamiento de diente completo
pub fn deactivate_tooth_treatment(treatment_id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Obtener datos del tratamiento antes de desactivar
    let treatment: Option<OdontogramToothTreatment> = conn
        .query_row(
            "SELECT id, patient_id, tooth_number, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_tooth_treatments WHERE id = ?1",
            params![treatment_id],
            |row| {
                Ok(OdontogramToothTreatment {
                    id: row.get(0)?,
                    patient_id: row.get(1)?,
                    tooth_number: row.get(2)?,
                    treatment_catalog_id: row.get(3)?,
                    treatment_catalog_item_id: row.get(4)?,
                    condition: row.get(5)?,
                    notes: row.get(6)?,
                    is_active: row.get::<_, i32>(7)? == 1,
                    applied_date: row.get(8)?,
                    created_at: row.get(9)?,
                    updated_at: row.get(10)?,
                    treatment_id: row.get(11)?,
                })
            },
        )
        .ok();

    if let Some(treatment) = treatment {
        // Desactivar el tratamiento
        conn.execute(
            "UPDATE odontogram_tooth_treatments SET is_active = 0, updated_at = ?1 WHERE id = ?2",
            params![&now, treatment_id],
        )
        .map_err(|e| format!("Error desactivando tratamiento: {}", e))?;

        // Registrar en historial
        conn.execute(
            "INSERT INTO odontogram_tooth_treatment_history (patient_id, tooth_number, treatment_catalog_id, 
                                                              treatment_catalog_item_id, condition, notes, 
                                                              action, applied_date, recorded_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'deactivated', ?7, ?8)",
            params![
                treatment.patient_id,
                treatment.tooth_number,
                treatment.treatment_catalog_id,
                treatment.treatment_catalog_item_id,
                treatment.condition,
                treatment.notes,
                treatment.applied_date,
                &now,
            ],
        )
        .map_err(|e| format!("Error registrando historial: {}", e))?;
    }

    Ok(())
}

/// Obtener historial de tratamientos de un diente
pub fn get_tooth_treatment_history(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Vec<ToothTreatmentHistoryEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, action, applied_date, recorded_at
             FROM odontogram_tooth_treatment_history
             WHERE patient_id = ?1 AND tooth_number = ?2
             ORDER BY recorded_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let history = stmt
        .query_map(params![patient_id, tooth_number], |row| {
            Ok(ToothTreatmentHistoryEntry {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                treatment_catalog_id: row.get(3)?,
                treatment_catalog_item_id: row.get(4)?,
                condition: row.get(5)?,
                notes: row.get(6)?,
                action: row.get(7)?,
                applied_date: row.get(8)?,
                recorded_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(history)
}

// ============================================================================
// Puentes dentales
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OdontogramBridge {
    pub id: i64,
    pub patient_id: i64,
    pub bridge_name: String,
    pub tooth_start: String,
    pub tooth_end: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub notes: Option<String>,
    pub is_active: bool,
    pub applied_date: String,
    pub created_at: String,
    pub updated_at: String,
    pub treatment_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddBridgeInput {
    pub patient_id: i64,
    pub bridge_name: String,
    pub tooth_start: String,
    pub tooth_end: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub notes: Option<String>,
    pub applied_date: Option<String>,
    pub treatment_id: Option<i64>,
}

/// Obtener todos los puentes activos de un paciente
pub fn get_bridges_by_patient(patient_id: i64) -> Result<Vec<OdontogramBridge>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, bridge_name, tooth_start, tooth_end, treatment_catalog_id, 
                    treatment_catalog_item_id, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_bridges
             WHERE patient_id = ?1 AND is_active = 1
             ORDER BY applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let bridges = stmt
        .query_map(params![patient_id], |row| {
            Ok(OdontogramBridge {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                bridge_name: row.get(2)?,
                tooth_start: row.get(3)?,
                tooth_end: row.get(4)?,
                treatment_catalog_id: row.get(5)?,
                treatment_catalog_item_id: row.get(6)?,
                notes: row.get(7)?,
                is_active: row.get::<_, i32>(8)? == 1,
                applied_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                treatment_id: row.get(12)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(bridges)
}

/// Agregar un puente dental
pub fn add_bridge(input: AddBridgeInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let applied_date = input.applied_date.unwrap_or_else(|| now.clone());

    conn.execute(
        "INSERT INTO odontogram_bridges (patient_id, bridge_name, tooth_start, tooth_end, 
                                         treatment_catalog_id, treatment_catalog_item_id, notes, 
                                         is_active, applied_date, created_at, updated_at, treatment_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?11)",
        params![
            input.patient_id,
            input.bridge_name,
            input.tooth_start,
            input.tooth_end,
            input.treatment_catalog_id,
            input.treatment_catalog_item_id,
            input.notes,
            &applied_date,
            &now,
            &now,
            input.treatment_id,
        ],
    )
    .map_err(|e| format!("Error insertando puente: {}", e))?;

    Ok(conn.last_insert_rowid())
}

/// Desactivar un puente dental
pub fn deactivate_bridge(bridge_id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE odontogram_bridges SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, bridge_id],
    )
    .map_err(|e| format!("Error desactivando puente: {}", e))?;

    Ok(())
}
