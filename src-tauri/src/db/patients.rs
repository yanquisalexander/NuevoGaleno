use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::get_connection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Patient {
    pub id: i64,
    pub legacy_patient_id: Option<String>,
    pub first_name: String,
    pub last_name: String,
    pub document_number: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub medical_notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePatientInput {
    pub first_name: String,
    pub last_name: String,
    pub document_number: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub medical_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePatientInput {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub document_number: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub birth_date: Option<String>,
    pub gender: Option<String>,
    pub blood_type: Option<String>,
    pub allergies: Option<String>,
    pub medical_notes: Option<String>,
}

impl UpdatePatientInput {
    /// Check if at least one field is set for update
    pub fn has_any_field(&self) -> bool {
        self.first_name.is_some()
            || self.last_name.is_some()
            || self.document_number.is_some()
            || self.phone.is_some()
            || self.email.is_some()
            || self.birth_date.is_some()
            || self.gender.is_some()
            || self.blood_type.is_some()
            || self.allergies.is_some()
            || self.medical_notes.is_some()
    }
}

pub fn create_patient(input: CreatePatientInput) -> Result<i64, String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    conn.execute(
        "INSERT INTO patients (
            first_name, last_name, document_number, phone, email, 
            birth_date, gender, blood_type, allergies, medical_notes,
            created_at, updated_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, '{}')",
        params![
            input.first_name,
            input.last_name,
            input.document_number,
            input.phone,
            input.email,
            input.birth_date,
            input.gender,
            input.blood_type,
            input.allergies,
            input.medical_notes,
            &now,
            &now,
        ],
    )
    .map_err(|e| format!("Error creando paciente: {}", e))?;

    Ok(conn.last_insert_rowid())
}

pub fn get_patient_by_id(id: i64) -> Result<Option<Patient>, String> {
    let conn = get_connection()?;

    let mut stmt = conn
        .prepare(
            "SELECT id, legacy_patient_id, first_name, last_name, document_number, phone, email,
                    birth_date, gender, blood_type, allergies, medical_notes, created_at, updated_at
             FROM patients WHERE id = ?1",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let result = stmt.query_row(params![id], |row| {
        Ok(Patient {
            id: row.get(0)?,
            legacy_patient_id: row.get(1)?,
            first_name: row.get(2)?,
            last_name: row.get(3)?,
            document_number: row.get(4)?,
            phone: row.get(5)?,
            email: row.get(6)?,
            birth_date: row.get(7)?,
            gender: row.get(8)?,
            blood_type: row.get(9)?,
            allergies: row.get(10)?,
            medical_notes: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    });

    match result {
        Ok(patient) => Ok(Some(patient)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Error obteniendo paciente: {}", e)),
    }
}

pub fn get_patients(limit: Option<i64>, offset: Option<i64>) -> Result<Vec<Patient>, String> {
    let conn = get_connection()?;
    let limit = limit.unwrap_or(100);
    let offset = offset.unwrap_or(0);

    let mut stmt = conn
        .prepare(
            "SELECT id, legacy_patient_id, first_name, last_name, document_number, phone, email,
                    birth_date, gender, blood_type, allergies, medical_notes, created_at, updated_at
             FROM patients 
             ORDER BY last_name, first_name
             LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let patients = stmt
        .query_map(params![limit, offset], |row| {
            Ok(Patient {
                id: row.get(0)?,
                legacy_patient_id: row.get(1)?,
                first_name: row.get(2)?,
                last_name: row.get(3)?,
                document_number: row.get(4)?,
                phone: row.get(5)?,
                email: row.get(6)?,
                birth_date: row.get(7)?,
                gender: row.get(8)?,
                blood_type: row.get(9)?,
                allergies: row.get(10)?,
                medical_notes: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(patients)
}

pub fn search_patients(query: &str) -> Result<Vec<Patient>, String> {
    let conn = get_connection()?;
    let search_pattern = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "SELECT id, legacy_patient_id, first_name, last_name, document_number, phone, email,
                    birth_date, gender, blood_type, allergies, medical_notes, created_at, updated_at
             FROM patients 
             WHERE first_name LIKE ?1 
                OR last_name LIKE ?1 
                OR document_number LIKE ?1 
                OR phone LIKE ?1
             ORDER BY last_name, first_name
             LIMIT 50",
        )
        .map_err(|e| format!("Error preparando query: {}", e))?;

    let patients = stmt
        .query_map(params![search_pattern], |row| {
            Ok(Patient {
                id: row.get(0)?,
                legacy_patient_id: row.get(1)?,
                first_name: row.get(2)?,
                last_name: row.get(3)?,
                document_number: row.get(4)?,
                phone: row.get(5)?,
                email: row.get(6)?,
                birth_date: row.get(7)?,
                gender: row.get(8)?,
                blood_type: row.get(9)?,
                allergies: row.get(10)?,
                medical_notes: row.get(11)?,
                created_at: row.get(12)?,
                updated_at: row.get(13)?,
            })
        })
        .map_err(|e| format!("Error ejecutando query: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Error recolectando resultados: {}", e))?;

    Ok(patients)
}

pub fn update_patient(id: i64, input: UpdatePatientInput) -> Result<(), String> {
    let conn = get_connection()?;
    let now = Utc::now().to_rfc3339();

    // Obtener paciente actual
    let current = get_patient_by_id(id)?.ok_or_else(|| "Paciente no encontrado".to_string())?;

    conn.execute(
        "UPDATE patients SET 
            first_name = ?1,
            last_name = ?2,
            document_number = ?3,
            phone = ?4,
            email = ?5,
            birth_date = ?6,
            gender = ?7,
            blood_type = ?8,
            allergies = ?9,
            medical_notes = ?10,
            updated_at = ?11
         WHERE id = ?12",
        params![
            input.first_name.unwrap_or(current.first_name),
            input.last_name.unwrap_or(current.last_name),
            input.document_number.or(current.document_number),
            input.phone.or(current.phone),
            input.email.or(current.email),
            input.birth_date.or(current.birth_date),
            input.gender.or(current.gender),
            input.blood_type.or(current.blood_type),
            input.allergies.or(current.allergies),
            input.medical_notes.or(current.medical_notes),
            &now,
            id,
        ],
    )
    .map_err(|e| format!("Error actualizando paciente: {}", e))?;

    Ok(())
}

pub fn delete_patient(id: i64) -> Result<(), String> {
    let conn = get_connection()?;

    conn.execute("DELETE FROM patients WHERE id = ?1", params![id])
        .map_err(|e| format!("Error eliminando paciente: {}", e))?;

    Ok(())
}

pub fn get_patients_count() -> Result<i64, String> {
    let conn = get_connection()?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM patients", [], |row| row.get(0))
        .map_err(|e| format!("Error contando pacientes: {}", e))?;

    Ok(count)
}
