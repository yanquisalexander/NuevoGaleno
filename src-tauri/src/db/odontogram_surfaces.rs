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
    pub created_at: String,
    pub updated_at: String,
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
pub struct ToothSurfaceData {
    pub tooth_number: String,
    pub surfaces: Vec<OdontogramSurface>,
}

pub fn get_odontogram_surfaces_by_patient(patient_id: i64) -> Result<Vec<OdontogramSurface>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, condition, notes, created_at, updated_at
             FROM odontogram_surfaces
             WHERE patient_id = ?1
             ORDER BY tooth_number, surface",
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
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(surfaces)
}

pub fn get_tooth_surfaces(patient_id: i64, tooth_number: &str) -> Result<Vec<OdontogramSurface>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, condition, notes, created_at, updated_at
             FROM odontogram_surfaces
             WHERE patient_id = ?1 AND tooth_number = ?2
             ORDER BY surface",
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
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error obteniendo resultados: {}", e))?;

    Ok(surfaces)
}

pub fn update_tooth_surface(input: UpdateSurfaceInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Verificar si ya existe
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM odontogram_surfaces WHERE patient_id = ?1 AND tooth_number = ?2 AND surface = ?3",
            params![input.patient_id, &input.tooth_number, &input.surface],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing {
        // Actualizar
        conn.execute(
            "UPDATE odontogram_surfaces
             SET treatment_catalog_id = ?1, treatment_catalog_item_id = ?2, condition = ?3, notes = ?4, updated_at = ?5
             WHERE id = ?6",
            params![
                input.treatment_catalog_id,
                input.treatment_catalog_item_id,
                &input.condition,
                input.notes,
                &now,
                id,
            ],
        )
        .map_err(|e| format!("Error actualizando superficie: {}", e))?;
        Ok(id)
    } else {
        // Crear
        conn.execute(
            "INSERT INTO odontogram_surfaces (patient_id, tooth_number, surface, treatment_catalog_id, treatment_catalog_item_id, condition, notes, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                input.patient_id,
                &input.tooth_number,
                &input.surface,
                input.treatment_catalog_id,
                input.treatment_catalog_item_id,
                &input.condition,
                input.notes,
                &now,
                &now,
            ],
        )
        .map_err(|e| format!("Error insertando superficie: {}", e))?;
        Ok(conn.last_insert_rowid())
    }
}

pub fn delete_tooth_surface(patient_id: i64, tooth_number: &str, surface: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontogram_surfaces WHERE patient_id = ?1 AND tooth_number = ?2 AND surface = ?3",
        params![patient_id, tooth_number, surface],
    )
    .map_err(|e| format!("Error eliminando superficie: {}", e))?;

    Ok(())
}

pub fn clear_tooth_surfaces(patient_id: i64, tooth_number: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontogram_surfaces WHERE patient_id = ?1 AND tooth_number = ?2",
        params![patient_id, tooth_number],
    )
    .map_err(|e| format!("Error limpiando superficies: {}", e))?;

    Ok(())
}
