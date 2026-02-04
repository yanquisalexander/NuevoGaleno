use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Treatment {
    pub id: i64,
    pub patient_id: i64,
    pub legacy_treatment_id: Option<String>,
    pub name: String,
    pub tooth_number: Option<String>,
    pub sector: Option<String>,
    pub status: String,
    pub total_cost: f64,
    pub paid_amount: f64,
    pub balance: f64,
    pub start_date: Option<String>,
    pub completion_date: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTreatmentInput {
    pub patient_id: i64,
    pub name: String,
    pub tooth_number: Option<String>,
    pub sector: Option<String>,
    pub total_cost: f64,
    pub start_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTreatmentInput {
    pub name: Option<String>,
    pub tooth_number: Option<String>,
    pub sector: Option<String>,
    pub status: Option<String>,
    pub total_cost: Option<f64>,
    pub start_date: Option<String>,
    pub completion_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TreatmentStats {
    pub pending_count: i64,
    pub in_progress_count: i64,
    pub completed_count: i64,
    pub total_pending_cost: f64,
    pub total_in_progress_cost: f64,
    pub total_completed_cost: f64,
}

pub fn create_treatment(input: CreateTreatmentInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO treatments (
            patient_id, name, tooth_number, sector, status,
            total_cost, paid_amount, balance, start_date, notes,
            created_at, updated_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, 'Pending', ?5, 0.0, ?5, ?6, ?7, ?8, ?9, '{}')",
        params![
            input.patient_id,
            input.name,
            input.tooth_number,
            input.sector,
            input.total_cost,
            input.start_date,
            input.notes,
            &now,
            &now,
        ],
    )
    .map_err(|e| format!("Error creando tratamiento: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_treatment_by_id(id: i64) -> Result<Option<Treatment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, legacy_treatment_id, name, tooth_number, sector, status,
                    total_cost, paid_amount, balance, start_date, completion_date, notes,
                    created_at, updated_at
             FROM treatments WHERE id = ?1",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![id], |row| {
        Ok(Treatment {
            id: row.get(0)?,
            patient_id: row.get(1)?,
            legacy_treatment_id: row.get(2)?,
            name: row.get(3)?,
            tooth_number: row.get(4)?,
            sector: row.get(5)?,
            status: row.get(6)?,
            total_cost: row.get(7)?,
            paid_amount: row.get(8)?,
            balance: row.get(9)?,
            start_date: row.get(10)?,
            completion_date: row.get(11)?,
            notes: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    });

    match result {
        Ok(treatment) => Ok(Some(treatment)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo tratamiento: {}", e)),
    }
}

pub fn get_treatments_by_patient(patient_id: i64) -> Result<Vec<Treatment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, legacy_treatment_id, name, tooth_number, sector, status,
                    total_cost, paid_amount, balance, start_date, completion_date, notes,
                    created_at, updated_at
             FROM treatments 
             WHERE patient_id = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let treatments = stmt
        .query_map(params![patient_id], |row| {
            Ok(Treatment {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                legacy_treatment_id: row.get(2)?,
                name: row.get(3)?,
                tooth_number: row.get(4)?,
                sector: row.get(5)?,
                status: row.get(6)?,
                total_cost: row.get(7)?,
                paid_amount: row.get(8)?,
                balance: row.get(9)?,
                start_date: row.get(10)?,
                completion_date: row.get(11)?,
                notes: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(treatments)
}

pub fn get_treatments_by_status(status: &str) -> Result<Vec<Treatment>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, legacy_treatment_id, name, tooth_number, sector, status,
                    total_cost, paid_amount, balance, start_date, completion_date, notes,
                    created_at, updated_at
             FROM treatments 
             WHERE status = ?1
             ORDER BY created_at DESC",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let treatments = stmt
        .query_map(params![status], |row| {
            Ok(Treatment {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                legacy_treatment_id: row.get(2)?,
                name: row.get(3)?,
                tooth_number: row.get(4)?,
                sector: row.get(5)?,
                status: row.get(6)?,
                total_cost: row.get(7)?,
                paid_amount: row.get(8)?,
                balance: row.get(9)?,
                start_date: row.get(10)?,
                completion_date: row.get(11)?,
                notes: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(treatments)
}

pub fn get_all_treatments(
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<Treatment>, String> {
    let conn = get_connection()?;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut stmt = conn
        .prepare(
            "SELECT id, patient_id, legacy_treatment_id, name, tooth_number, sector, status,
                    total_cost, paid_amount, balance, start_date, completion_date, notes,
                    created_at, updated_at
             FROM treatments 
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let treatments = stmt
        .query_map(params![limit, offset], |row| {
            Ok(Treatment {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                legacy_treatment_id: row.get(2)?,
                name: row.get(3)?,
                tooth_number: row.get(4)?,
                sector: row.get(5)?,
                status: row.get(6)?,
                total_cost: row.get(7)?,
                paid_amount: row.get(8)?,
                balance: row.get(9)?,
                start_date: row.get(10)?,
                completion_date: row.get(11)?,
                notes: row.get(12)?,
                created_at: row.get(13)?,
                updated_at: row.get(14)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(treatments)
}

pub fn update_treatment(id: i64, input: UpdateTreatmentInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    let current =
        get_treatment_by_id(id)?.ok_or_else(|| "Tratamiento no encontrado".to_string())?;

    let new_total_cost = input.total_cost.unwrap_or(current.total_cost);
    let new_balance = new_total_cost - current.paid_amount;

    conn.execute(
        "UPDATE treatments SET 
            name = ?1,
            tooth_number = ?2,
            sector = ?3,
            status = ?4,
            total_cost = ?5,
            balance = ?6,
            start_date = ?7,
            completion_date = ?8,
            notes = ?9,
            updated_at = ?10
         WHERE id = ?11",
        params![
            input.name.unwrap_or(current.name),
            input.tooth_number.or(current.tooth_number),
            input.sector.or(current.sector),
            input.status.unwrap_or(current.status),
            new_total_cost,
            new_balance,
            input.start_date.or(current.start_date),
            input.completion_date.or(current.completion_date),
            input.notes.or(current.notes),
            &now,
            id,
        ],
    )
    .map_err(|e| format!("Error actualizando tratamiento: {}", e))?;

    Ok(())
}

pub fn update_treatment_status(id: i64, status: &str) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    let completion_date = if status == "Completed" {
        Some(now.clone())
    } else {
        None
    };

    conn.execute(
        "UPDATE treatments SET 
            status = ?1,
            completion_date = ?2,
            updated_at = ?3
         WHERE id = ?4",
        params![status, completion_date, &now, id],
    )
    .map_err(|e| format!("Error actualizando estado del tratamiento: {}", e))?;

    Ok(())
}

pub fn delete_treatment(id: i64) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute("DELETE FROM treatments WHERE id = ?1", params![id])
        .map_err(|e| format!("Error eliminando tratamiento: {}", e))?;

    Ok(())
}

pub fn recalculate_treatment_balance(treatment_id: i64) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Obtener suma de pagos
    let paid: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE treatment_id = ?1",
            params![treatment_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error calculando pagos: {}", e))?;

    // Obtener costo total
    let total_cost: f64 = conn
        .query_row(
            "SELECT total_cost FROM treatments WHERE id = ?1",
            params![treatment_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error obteniendo costo total: {}", e))?;

    let balance = total_cost - paid;

    // Actualizar tratamiento
    conn.execute(
        "UPDATE treatments SET paid_amount = ?1, balance = ?2, updated_at = ?3 WHERE id = ?4",
        params![paid, balance, &now, treatment_id],
    )
    .map_err(|e| format!("Error actualizando balance: {}", e))?;

    Ok(())
}

pub fn get_treatment_stats() -> Result<TreatmentStats, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT 
                COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'InProgress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
                COALESCE(SUM(CASE WHEN status = 'Pending' THEN total_cost ELSE 0 END), 0) as pending_cost,
                COALESCE(SUM(CASE WHEN status = 'InProgress' THEN total_cost ELSE 0 END), 0) as in_progress_cost,
                COALESCE(SUM(CASE WHEN status = 'Completed' THEN total_cost ELSE 0 END), 0) as completed_cost
             FROM treatments"
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let stats = stmt
        .query_row([], |row| {
            Ok(TreatmentStats {
                pending_count: row.get(0)?,
                in_progress_count: row.get(1)?,
                completed_count: row.get(2)?,
                total_pending_cost: row.get(3)?,
                total_in_progress_cost: row.get(4)?,
                total_completed_cost: row.get(5)?,
            })
        })
        .map_err(|e| format!("Error obteniendo estadísticas: {}", e))?;

    Ok(stats)
}
