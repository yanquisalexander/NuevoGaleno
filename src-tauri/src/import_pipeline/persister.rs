// Persistidor: Guarda datos en SQLite con transacciones seguras
// Etapa 5: Inserción transaccional en base de datos

use crate::import_pipeline::models::*;
use rusqlite::{Connection, Transaction};
use chrono;

/// Resultado de la persistencia
pub struct PersistResult {
    pub success: bool,
    pub patients_inserted: usize,
    pub treatments_inserted: usize,
    pub payments_inserted: usize,
    pub odontograms_inserted: usize,
    pub error: Option<String>,
}

/// Persiste todos los datos en SQLite de forma transaccional
/// Si ocurre un error, hace rollback automático
pub fn persist_all(
    conn: &mut Connection,
    patients: &[PatientDto],
) -> Result<PersistResult, String> {
    // Iniciar transacción
    let tx = conn
        .transaction()
        .map_err(|e| format!("Error iniciando transacción: {}", e))?;

    // Asegurar que existen las tablas
    ensure_schema(&tx)?;

    let mut result = PersistResult {
        success: false,
        patients_inserted: 0,
        treatments_inserted: 0,
        payments_inserted: 0,
        odontograms_inserted: 0,
        error: None,
    };

    // Insertar cada paciente con sus relaciones
    for patient in patients {
        match insert_patient_with_relations(&tx, patient) {
            Ok((treatments_count, payments_count, odontograms_count)) => {
                result.patients_inserted += 1;
                result.treatments_inserted += treatments_count;
                result.payments_inserted += payments_count;
                result.odontograms_inserted += odontograms_count;
            }
            Err(e) => {
                // En caso de error, hacer rollback implícito
                result.error = Some(format!(
                    "Error insertando paciente {}: {}",
                    patient.full_name(),
                    e
                ));
                return Err(result.error.clone().unwrap());
            }
        }
    }

    // Commit si todo salió bien
    tx.commit().map_err(|e| format!("Error en commit: {}", e))?;

    result.success = true;
    Ok(result)
}

/// Asegura que existan las tablas necesarias
fn ensure_schema(tx: &Transaction) -> Result<(), String> {
    tx.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legacy_id TEXT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            document_type TEXT,
            document_number TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            birth_date TEXT,
            gender TEXT,
            blood_type TEXT,
            allergies TEXT,
            medical_notes TEXT,
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(legacy_id)
        );

        CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_number);
        CREATE INDEX IF NOT EXISTS idx_patients_legacy_id ON patients(legacy_id);

        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            legacy_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            tooth_number TEXT,
            sector TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            total_cost REAL NOT NULL DEFAULT 0.0,
            paid_amount REAL NOT NULL DEFAULT 0.0,
            balance REAL NOT NULL DEFAULT 0.0,
            planned_date TEXT,
            started_date TEXT,
            completed_date TEXT,
            notes TEXT,
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_status ON treatments(status);
        CREATE INDEX IF NOT EXISTS idx_treatments_legacy_id ON treatments(legacy_id);

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            treatment_id INTEGER NOT NULL,
            legacy_id TEXT,
            amount REAL NOT NULL,
            payment_date TEXT,
            payment_method TEXT,
            notes TEXT,
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_payments_treatment ON payments(treatment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
        
        CREATE TABLE IF NOT EXISTS odontograms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            legacy_id TEXT,
            tooth_number TEXT NOT NULL,
            condition TEXT NOT NULL,
            notes TEXT,
            color TEXT,
            date TEXT,
            raw_data TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms(patient_id);
        CREATE INDEX IF NOT EXISTS idx_odontograms_tooth ON odontograms(tooth_number);
        "#,
    )
    .map_err(|e| format!("Error creando schema: {}", e))?;

    Ok(())
}

/// Inserta un paciente con todos sus tratamientos y pagos
fn insert_patient_with_relations(
    tx: &Transaction,
    patient: &PatientDto,
) -> Result<(usize, usize, usize), String> {
    // 1. Insertar paciente
    let patient_id = insert_patient(tx, patient)?;

    let mut treatments_count = 0;
    let mut payments_count = 0;
    let mut odontograms_count = 0;

    // 2. Insertar tratamientos
    for treatment in &patient.treatments {
        let treatment_id = insert_treatment(tx, patient_id, treatment)?;
        treatments_count += 1;

        // 3. Insertar pagos
        for payment in &treatment.payments {
            insert_payment(tx, treatment_id, payment)?;
            payments_count += 1;
        }
    }

    // 4. Insertar odontogramas
    for odontogram in &patient.odontograms {
        insert_odontogram(tx, patient_id, odontogram)?;
        odontograms_count += 1;
    }

    Ok((treatments_count, payments_count, odontograms_count))
}

fn insert_patient(tx: &Transaction, patient: &PatientDto) -> Result<i64, String> {
    let raw_json = serde_json::to_string(&patient.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO patients (
            legacy_id, first_name, last_name, document_type, document_number,
            phone, email, address, city, postal_code,
            birth_date, gender, blood_type, allergies, medical_notes, 
            created_at, updated_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
        "#,
        rusqlite::params![
            patient.legacy_id,
            patient.first_name,
            patient.last_name,
            patient.document_type,
            patient.document_number,
            patient.phone,
            patient.email,
            patient.address,
            patient.city,
            patient.postal_code,
            patient.birth_date,
            patient.gender,
            patient.blood_type,
            patient.allergies,
            patient.medical_notes,
            now,
            now,
            raw_json,
        ],
    )
    .map_err(|e| format!("Error insertando paciente: {}", e))?;

    Ok(tx.last_insert_rowid())
}

fn insert_treatment(
    tx: &Transaction,
    patient_id: i64,
    treatment: &TreatmentDto,
) -> Result<i64, String> {
    let raw_json = serde_json::to_string(&treatment.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO treatments (
            patient_id, legacy_id, name, description, tooth_number, sector,
            status, total_cost, paid_amount, balance,
            planned_date, started_date, completed_date, notes, 
            created_at, updated_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
        "#,
        rusqlite::params![
            patient_id,
            treatment.legacy_id,
            treatment.name,
            treatment.description,
            treatment.tooth_number,
            treatment.sector,
            treatment.status.to_db_value(),
            treatment.total_cost,
            treatment.paid_amount,
            treatment.balance,
            treatment.planned_date,
            treatment.started_date,
            treatment.completed_date,
            treatment.notes,
            now,
            now,
            raw_json,
        ],
    )
    .map_err(|e| format!("Error insertando tratamiento: {}", e))?;

    Ok(tx.last_insert_rowid())
}

fn insert_payment(
    tx: &Transaction,
    treatment_id: i64,
    payment: &PaymentDto,
) -> Result<i64, String> {
    let raw_json = serde_json::to_string(&payment.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO payments (
            treatment_id, legacy_id, amount, payment_date, payment_method, notes, 
            created_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        "#,
        rusqlite::params![
            treatment_id,
            payment.legacy_id,
            payment.amount,
            payment.payment_date,
            payment.payment_method,
            payment.notes,
            now,
            raw_json,
        ],
    )
    .map_err(|e| format!("Error insertando pago: {}", e))?;

    Ok(tx.last_insert_rowid())
}

fn insert_odontogram(
    tx: &Transaction,
    patient_id: i64,
    odontogram: &OdontogramDto,
) -> Result<i64, String> {
    let raw_json = serde_json::to_string(&odontogram.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO odontograms (
            patient_id, legacy_id, tooth_number, condition, notes, color, date, 
            created_at, updated_at, raw_data
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        rusqlite::params![
            patient_id,
            odontogram.legacy_id,
            odontogram.tooth_number,
            odontogram.condition,
            odontogram.notes,
            odontogram.color,
            odontogram.date,
            now,
            now,
            raw_json,
        ],
    )
    .map_err(|e| format!("Error insertando odontograma: {}", e))?;

    Ok(tx.last_insert_rowid())
}

/// Verifica si ya se importaron datos previamente (previene duplicados)
pub fn check_existing_imports(conn: &Connection) -> Result<bool, String> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM patients WHERE legacy_id IS NOT NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("Error verificando importaciones previas: {}", e))?;

    Ok(count > 0)
}

/// Limpia importaciones previas (CUIDADO: destructivo)
pub fn clear_imported_data(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        DELETE FROM payments WHERE treatment_id IN (
            SELECT id FROM treatments WHERE legacy_id IS NOT NULL
        );
        DELETE FROM treatments WHERE patient_id IN (
            SELECT id FROM patients WHERE legacy_id IS NOT NULL
        );
        DELETE FROM patients WHERE legacy_id IS NOT NULL;
        "#,
    )
    .map_err(|e| format!("Error limpiando datos importados: {}", e))?;

    Ok(())
}
