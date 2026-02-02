use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OdontogramEntry {
    pub id: i64,
    pub patient_id: i64,
    pub tooth_number: String,
    pub condition: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateToothConditionInput {
    pub patient_id: i64,
    pub tooth_number: String,
    pub condition: String,
    pub notes: Option<String>,
}

pub fn get_odontogram_by_patient(patient_id: i64) -> Result<Vec<OdontogramEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, condition, notes, created_at, updated_at
             FROM odontograms
             WHERE patient_id = ?1
             ORDER BY tooth_number",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let entries = stmt
        .query_map(params![patient_id], |row| {
            Ok(OdontogramEntry {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                condition: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(entries)
}

pub fn get_tooth_by_patient_and_number(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Option<OdontogramEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, condition, notes, created_at, updated_at
             FROM odontograms
             WHERE patient_id = ?1 AND tooth_number = ?2",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![patient_id, tooth_number], |row| {
        Ok(OdontogramEntry {
            id: row.get(0)?,
            patient_id: row.get(1)?,
            tooth_number: row.get(2)?,
            condition: row.get(3)?,
            notes: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    });

    match result {
        Ok(entry) => Ok(Some(entry)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo entrada: {}", e)),
    }
}

pub fn update_tooth_condition(input: UpdateToothConditionInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Verificar si ya existe una entrada para este diente
    let existing = get_tooth_by_patient_and_number(input.patient_id, &input.tooth_number)?;

    if let Some(entry) = existing {
        // Actualizar entrada existente
        conn.execute(
            "UPDATE odontograms SET 
                condition = ?1,
                notes = ?2,
                updated_at = ?3
             WHERE id = ?4",
            params![input.condition, input.notes, &now, entry.id,],
        )
        .map_err(|e| format!("Error actualizando condición: {}", e))?;

        Ok(entry.id)
    } else {
        // Crear nueva entrada
        conn.execute(
            "INSERT INTO odontograms (
                patient_id, tooth_number, condition, notes, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                input.patient_id,
                input.tooth_number,
                input.condition,
                input.notes,
                &now,
                &now,
            ],
        )
        .map_err(|e| format!("Error creando condición: {}", e))?;

        Ok(conn.last_insert_rowid())
    }
}

pub fn delete_tooth_condition(patient_id: i64, tooth_number: &str) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontograms WHERE patient_id = ?1 AND tooth_number = ?2",
        params![patient_id, tooth_number],
    )
    .map_err(|e| format!("Error eliminando condición: {}", e))?;

    Ok(())
}

pub fn clear_patient_odontogram(patient_id: i64) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute(
        "DELETE FROM odontograms WHERE patient_id = ?1",
        params![patient_id],
    )
    .map_err(|e| format!("Error limpiando odontograma: {}", e))?;

    Ok(())
}

pub fn get_tooth_history(
    patient_id: i64,
    tooth_number: &str,
) -> Result<Vec<OdontogramEntry>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, tooth_number, condition, notes, created_at, updated_at
             FROM odontograms
             WHERE patient_id = ?1 AND tooth_number = ?2
             ORDER BY updated_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let entries = stmt
        .query_map(params![patient_id, tooth_number], |row| {
            Ok(OdontogramEntry {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                tooth_number: row.get(2)?,
                condition: row.get(3)?,
                notes: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(entries)
}
