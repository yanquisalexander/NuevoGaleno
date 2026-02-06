use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OdontogramSurface {
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
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
pub struct SurfaceHistoryEntry {
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub action: String,
    pub applied_date: String,
    pub recorded_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSurfaceInput {
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddSurfaceTreatmentInput {
    pub patient_id: i64,
    pub tooth_number: String,
    pub surface: String,
    pub treatment_catalog_id: Option<i64>,
    pub treatment_catalog_item_id: Option<i64>,
    pub condition: String,
    pub notes: Option<String>,
    pub applied_date: Option<String>,
    pub treatment_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToothSurfaceData {
    pub tooth_number: String,
    pub surfaces: Vec<OdontogramSurface>,
}

/// Obtener todas las superficies activas de un paciente
pub fn get_odontogram_surfaces_by_patient(
    patient_id: i64,
) -> Result<Vec<OdontogramSurface>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_surfaces
             WHERE patient_id = ?1 AND is_active = 1
             ORDER BY tooth_number, surface, applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let surfaces = stmt
        .query_map(params![patient_id], |row| {
            Ok(OdontogramSurface {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                surface: row.get(3)?,
                treatment_catalog_id: row.get(4)?,
                treatment_catalog_item_id: row.get(5)?,
                condition: row.get(6)?,
                notes: row.get(7)?,
                is_active: row.get(8)?,
                applied_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                treatment_id: row.get(12)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(surfaces)
}

/// Obtener todas las superficies de un diente específico (activas e inactivas)
pub fn get_tooth_surfaces(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Vec<OdontogramSurface>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_surfaces
             WHERE patient_id = ?1 AND tooth_number = ?2
             ORDER BY surface, is_active DESC, applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let surfaces = stmt
        .query_map(params![patient_id, tooth_number], |row| {
            Ok(OdontogramSurface {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                surface: row.get(3)?,
                treatment_catalog_id: row.get(4)?,
                treatment_catalog_item_id: row.get(5)?,
                condition: row.get(6)?,
                notes: row.get(7)?,
                is_active: row.get(8)?,
                applied_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                treatment_id: row.get(12)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(surfaces)
}

/// Obtener todos los tratamientos de una superficie específica (activos)
pub fn get_surface_treatments(
    patient_id: i64,
    tooth_number: &str,
    surface: &str,
) -> Result<Vec<OdontogramSurface>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_surfaces
             WHERE patient_id = ?1 AND tooth_number = ?2 AND surface = ?3 AND is_active = 1
             ORDER BY applied_date DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let surfaces = stmt
        .query_map(params![patient_id, tooth_number, surface], |row| {
            Ok(OdontogramSurface {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                surface: row.get(3)?,
                treatment_catalog_id: row.get(4)?,
                treatment_catalog_item_id: row.get(5)?,
                condition: row.get(6)?,
                notes: row.get(7)?,
                is_active: row.get(8)?,
                applied_date: row.get(9)?,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
                treatment_id: row.get(12)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(surfaces)
}

/// Añadir un nuevo tratamiento a una superficie (permite múltiples tratamientos)
pub fn add_tooth_surface_treatment(input: AddSurfaceTreatmentInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();
    let applied_date = input.applied_date.unwrap_or_else(|| now.clone());

    // Insertar nuevo tratamiento
    conn.execute(
        "INSERT INTO odontogram_surfaces 
         (patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
          condition, notes, is_active, applied_date, created_at, updated_at, treatment_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9, ?10, ?11)",
        params![
            input.patient_id,
            &input.tooth_number,
            &input.surface,
            input.treatment_catalog_id,
            input.treatment_catalog_item_id,
            &input.condition,
            input.notes,
            &applied_date,
            &now,
            &now,
            input.treatment_id,
        ],
    )
    .map_err(|e| format!("Error insertando tratamiento de superficie: {}", e))?;

    let new_id = conn.last_insert_rowid();

    // Registrar en historial
    conn.execute(
        "INSERT INTO odontogram_surface_history 
         (patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
          condition, notes, action, applied_date, recorded_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'created', ?8, ?9)",
        params![
            input.patient_id,
            &input.tooth_number,
            &input.surface,
            input.treatment_catalog_id,
            input.treatment_catalog_item_id,
            &input.condition,
            input.notes,
            &applied_date,
            &now,
        ],
    )
    .map_err(|e| format!("Error registrando historial: {}", e))?;

    Ok(new_id)
}

/// Actualizar un tratamiento de superficie existente (mantiene compatibilidad con API antigua)
pub fn update_tooth_surface(input: UpdateSurfaceInput) -> Result<i64, String> {
    // Comportamiento: añade un nuevo tratamiento a la superficie
    add_tooth_surface_treatment(AddSurfaceTreatmentInput {
        patient_id: input.patient_id,
        tooth_number: input.tooth_number,
        surface: input.surface,
        treatment_catalog_id: input.treatment_catalog_id,
        treatment_catalog_item_id: input.treatment_catalog_item_id,
        condition: input.condition,
        notes: input.notes,
        applied_date: None,
        treatment_id: None,
    })
}

/// Desactivar un tratamiento específico de superficie
pub fn deactivate_surface_treatment(surface_id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Obtener datos antes de desactivar
    let surface: OdontogramSurface = conn
        .query_row(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, is_active, applied_date, created_at, updated_at, treatment_id
             FROM odontogram_surfaces WHERE id = ?1",
            params![surface_id],
            |row| {
                Ok(OdontogramSurface {
                    id: row.get(0)?,
                    patient_id: row.get(1)?,
                    tooth_number: row.get(2)?,
                    surface: row.get(3)?,
                    treatment_catalog_id: row.get(4)?,
                    treatment_catalog_item_id: row.get(5)?,
                    condition: row.get(6)?,
                    notes: row.get(7)?,
                    is_active: row.get(8)?,
                    applied_date: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                    treatment_id: row.get(12)?,
                })
            },
        )
        .map_err(|e| format!("Error obteniendo superficie: {}", e))?;

    // Desactivar
    conn.execute(
        "UPDATE odontogram_surfaces SET is_active = 0, updated_at = ?1 WHERE id = ?2",
        params![&now, surface_id],
    )
    .map_err(|e| format!("Error desactivando tratamiento: {}", e))?;

    // Registrar en historial
    conn.execute(
        "INSERT INTO odontogram_surface_history 
         (patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
          condition, notes, action, applied_date, recorded_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'deactivated', ?8, ?9)",
        params![
            surface.patient_id,
            &surface.tooth_number,
            &surface.surface,
            surface.treatment_catalog_id,
            surface.treatment_catalog_item_id,
            &surface.condition,
            surface.notes,
            &surface.applied_date,
            &now,
        ],
    )
    .map_err(|e| format!("Error registrando historial: {}", e))?;

    Ok(())
}

/// Obtener historial de una superficie específica
pub fn get_surface_history(
    patient_id: i64,
    tooth_number: &str,
    surface: &str,
) -> Result<Vec<SurfaceHistoryEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, action, applied_date, recorded_at
             FROM odontogram_surface_history
             WHERE patient_id = ?1 AND tooth_number = ?2 AND surface = ?3
             ORDER BY recorded_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let history = stmt
        .query_map(params![patient_id, tooth_number, surface], |row| {
            Ok(SurfaceHistoryEntry {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                surface: row.get(3)?,
                treatment_catalog_id: row.get(4)?,
                treatment_catalog_item_id: row.get(5)?,
                condition: row.get(6)?,
                notes: row.get(7)?,
                action: row.get(8)?,
                applied_date: row.get(9)?,
                recorded_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(history)
}

/// Obtener historial completo de un diente
pub fn get_tooth_history(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Vec<SurfaceHistoryEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, 
                    condition, notes, action, applied_date, recorded_at
             FROM odontogram_surface_history
             WHERE patient_id = ?1 AND tooth_number = ?2
             ORDER BY recorded_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let history = stmt
        .query_map(params![patient_id, tooth_number], |row| {
            Ok(SurfaceHistoryEntry {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                surface: row.get(3)?,
                treatment_catalog_id: row.get(4)?,
                treatment_catalog_item_id: row.get(5)?,
                condition: row.get(6)?,
                notes: row.get(7)?,
                action: row.get(8)?,
                applied_date: row.get(9)?,
                recorded_at: row.get(10)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(history)
}

/// Eliminar físicamente una superficie (usar con precaución)
pub fn delete_tooth_surface(
    patient_id: i64,
    tooth_number: &str,
    surface: &str,
) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontogram_surfaces WHERE patient_id = ?1 AND tooth_number = ?2 AND surface = ?3",
        params![patient_id, tooth_number, surface],
    )
    .map_err(|e| format!("Error eliminando superficie: {}", e))?;

    Ok(())
}

/// Eliminar todas las superficies de un diente (usar con precaución)
pub fn clear_tooth_surfaces(patient_id: i64, tooth_number: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontogram_surfaces WHERE patient_id = ?1 AND tooth_number = ?2",
        params![patient_id, tooth_number],
    )
    .map_err(|e| format!("Error limpiando superficies: {}", e))?;

    Ok(())
}
