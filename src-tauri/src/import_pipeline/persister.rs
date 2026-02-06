// Persistidor: Guarda datos en SQLite con transacciones seguras e idempotentes
// Etapa 5: Inserción transaccional en base de datos

use crate::import_pipeline::models::*;
use rusqlite::{params, Connection, Transaction};
use serde_json;

/// Resultado de la persistencia
pub struct PersistResult {
    pub success: bool,
    pub patients_inserted: usize,
    pub treatments_inserted: usize,
    pub payments_inserted: usize,
    pub odontograms_inserted: usize,
    pub history_documents_inserted: usize,
    pub anomalies_recorded: usize,
    pub error: Option<String>,
}

/// Progreso granular durante la persistencia para mostrar en UI
pub struct PersistProgress {
    pub stage: &'static str,
    pub current: usize,
    pub total: usize,
    pub message: String,
}

/// Persiste todos los datos en SQLite de forma transaccional y trazable
pub fn persist_all(
    conn: &mut Connection,
    run_id: &str,
    source_path: &str,
    patients: &[PatientDto],
    orphan_treatments: &[TreatmentDto],
    orphan_payments: &[PaymentDto],
    orphan_odontograms: &[OdontogramDto],
    anomalies: &[ImportAnomalyDto],
    mut progress_cb: Option<&mut dyn FnMut(PersistProgress)>,
) -> Result<PersistResult, String> {
    ensure_schema(conn)?;
    start_import_run(conn, run_id, source_path)?;

    let mut result = PersistResult {
        success: false,
        patients_inserted: 0,
        treatments_inserted: 0,
        payments_inserted: 0,
        odontograms_inserted: 0,
        history_documents_inserted: 0,
        anomalies_recorded: 0,
        error: None,
    };

    let tx_result: Result<(), String> = (|| {
        let tx = conn
            .transaction()
            .map_err(|e| format!("Error iniciando transacción: {}", e))?;

        tx.execute(
            "UPDATE import_runs SET status = 'in_progress' WHERE run_id = ?1",
            params![run_id],
        )
        .map_err(|e| format!("Error actualizando estado de run: {}", e))?;

        for (idx, patient) in patients.iter().enumerate() {
            emit_progress(
                &mut progress_cb,
                "patients",
                idx + 1,
                patients.len(),
                format!(
                    "Paciente {} de {}: {}",
                    idx + 1,
                    patients.len(),
                    patient.full_name()
                ),
            );

            let patient_id = upsert_patient(&tx, run_id, patient)?;
            result.patients_inserted += 1;

            if let Some(ref legacy_id) = patient.legacy_patient_id {
                upsert_legacy_patient_map(&tx, run_id, legacy_id, patient_id, &patient.metadata)?;
            }

            for treatment in &patient.treatments {
                if let Some(treatment_row_id) =
                    upsert_treatment(&tx, run_id, Some(patient_id), treatment)?
                {
                    result.treatments_inserted += 1;

                    if let Some(ref legacy_id) = treatment.legacy_treatment_id {
                        upsert_legacy_treatment_map(
                            &tx,
                            run_id,
                            legacy_id,
                            treatment_row_id,
                            Some(patient_id),
                            &treatment.metadata,
                        )?;
                    }

                    for payment in &treatment.payments {
                        let payment_id = upsert_payment(
                            &tx,
                            run_id,
                            Some(patient_id),
                            Some(treatment_row_id),
                            payment,
                        )?;
                        if payment_id.is_some() {
                            result.payments_inserted += 1;
                        }
                    }
                }
            }

            for payment in &patient.orphan_payments {
                if upsert_payment(&tx, run_id, Some(patient_id), None, payment)?.is_some() {
                    result.payments_inserted += 1;
                }
            }

            for (doc_idx, doc) in patient.history_documents.iter().enumerate() {
                emit_progress(
                    &mut progress_cb,
                    "history",
                    doc_idx + 1,
                    patient.history_documents.len().max(1),
                    format!(
                        "Historia clínica de {} ({}/{})",
                        patient.full_name(),
                        doc_idx + 1,
                        patient.history_documents.len()
                    ),
                );

                match upsert_history_document(&tx, run_id, patient_id, doc) {
                    Ok(Some(_)) => {
                        result.history_documents_inserted += 1;
                    }
                    Ok(None) => {}
                    Err(err) => {
                        // Intentar un fallback truncado para evitar abortar toda la importación
                        let mut fallback_doc = doc.clone();
                        fallback_doc.encountered_error = Some(err.clone());

                        if let Some(ref content) = fallback_doc.content_base64 {
                            const FALLBACK_LEN: usize = 2_000;
                            if content.len() > FALLBACK_LEN {
                                fallback_doc.content_base64 = Some(format!(
                                    "{}\n...[TRUNCATED {} chars]",
                                    &content[..FALLBACK_LEN],
                                    content.len() - FALLBACK_LEN
                                ));
                            }
                        }

                        match upsert_history_document(&tx, run_id, patient_id, &fallback_doc) {
                            Ok(Some(_)) => {
                                result.history_documents_inserted += 1;
                                result.anomalies_recorded += 1;
                                insert_anomaly(
                                    &tx,
                                    run_id,
                                    &ImportAnomalyDto {
                                        severity: "warning".to_string(),
                                        entity_type: "clinical_history".to_string(),
                                        legacy_reference: Some(doc.legacy_patient_id.clone()),
                                        run_id: Some(run_id.to_string()),
                                        message: format!(
                                            "Historia clínica {} guardada truncada por error: {}",
                                            doc.legacy_filename, err
                                        ),
                                        details: serde_json::json!({
                                            "filename": doc.legacy_filename,
                                            "fallback": true
                                        }),
                                    },
                                )?;
                            }
                            Ok(None) => {}
                            Err(err2) => {
                                result.anomalies_recorded += 1;
                                insert_anomaly(
                                    &tx,
                                    run_id,
                                    &ImportAnomalyDto {
                                        severity: "error".to_string(),
                                        entity_type: "clinical_history".to_string(),
                                        legacy_reference: Some(doc.legacy_patient_id.clone()),
                                        run_id: Some(run_id.to_string()),
                                        message: format!(
                                            "No se pudo almacenar historia clínica {}: {}",
                                            doc.legacy_filename, err2
                                        ),
                                        details: serde_json::json!({
                                            "filename": doc.legacy_filename,
                                            "initial_error": err,
                                            "fallback_error": err2
                                        }),
                                    },
                                )?;
                            }
                        }
                    }
                }
            }
        }

        emit_progress(
            &mut progress_cb,
            "orphans",
            0,
            orphan_treatments.len() + orphan_payments.len() + orphan_odontograms.len(),
            "Procesando registros huérfanos...",
        );

        for (idx, treatment) in orphan_treatments.iter().enumerate() {
            emit_progress(
                &mut progress_cb,
                "orphans",
                idx + 1,
                orphan_treatments.len() + orphan_payments.len() + orphan_odontograms.len(),
                "Tratamientos huérfanos",
            );
            let opt_patient_id = None;
            if let Some(treatment_id) = upsert_treatment(&tx, run_id, opt_patient_id, treatment)? {
                result.treatments_inserted += 1;
                if let Some(ref legacy_id) = treatment.legacy_treatment_id {
                    upsert_legacy_treatment_map(
                        &tx,
                        run_id,
                        legacy_id,
                        treatment_id,
                        None,
                        &treatment.metadata,
                    )?;
                }
            }
            record_orphan_anomaly(
                &tx,
                run_id,
                "treatment",
                treatment
                    .legacy_treatment_id
                    .as_deref()
                    .unwrap_or(treatment.temp_id.as_str()),
                "Tratamiento sin paciente asociado",
                &treatment.raw_data,
            )?;
            result.anomalies_recorded += 1;
        }

        for (idx, payment) in orphan_payments.iter().enumerate() {
            emit_progress(
                &mut progress_cb,
                "orphans",
                orphan_treatments.len() + idx + 1,
                orphan_treatments.len() + orphan_payments.len() + orphan_odontograms.len(),
                "Pagos huérfanos",
            );
            if upsert_payment(&tx, run_id, None, None, payment)?.is_some() {
                result.payments_inserted += 1;
            }
            record_orphan_anomaly(
                &tx,
                run_id,
                "payment",
                payment
                    .legacy_payment_id
                    .as_deref()
                    .unwrap_or(payment.temp_id.as_str()),
                "Pago sin tratamiento ni paciente resuelto",
                &payment.raw_data,
            )?;
            result.anomalies_recorded += 1;
        }

        for (idx, odontogram) in orphan_odontograms.iter().enumerate() {
            emit_progress(
                &mut progress_cb,
                "orphans",
                orphan_treatments.len() + orphan_payments.len() + idx + 1,
                orphan_treatments.len() + orphan_payments.len() + orphan_odontograms.len(),
                "Odontogramas huérfanos",
            );
            if upsert_odontogram(&tx, run_id, None, odontogram)?.is_some() {
                result.odontograms_inserted += 1;
            }
            record_orphan_anomaly(
                &tx,
                run_id,
                "odontogram",
                odontogram
                    .legacy_record_id
                    .as_deref()
                    .unwrap_or(odontogram.temp_id.as_str()),
                "Odontograma sin paciente asociado",
                &odontogram.raw_data,
            )?;
            result.anomalies_recorded += 1;
        }

        for anomaly in anomalies {
            insert_anomaly(&tx, run_id, anomaly)?;
            result.anomalies_recorded += 1;
        }

        tx.commit()
            .map_err(|e| format!("Error al confirmar transacción: {}", e))?;

        Ok(())
    })();

    match tx_result {
        Ok(_) => {
            finalize_import_run(conn, run_id, "completed", Some(&result))?;
            let mut final_result = result;
            final_result.success = true;
            Ok(final_result)
        }
        Err(err) => {
            finalize_import_run(conn, run_id, "failed", None)?;
            Err(err)
        }
    }
}

/// Verifica si ya se importaron datos previamente (previene duplicados)
pub fn check_existing_imports(conn: &Connection) -> Result<bool, String> {
    ensure_schema(conn)?;
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM legacy_patient_map", [], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Error verificando importaciones previas: {}", e))?;

    Ok(count > 0)
}

/// Limpia importaciones previas (CUIDADO: destructivo)
pub fn clear_imported_data(conn: &mut Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = OFF;
        
        DROP TABLE IF EXISTS clinical_history_documents;
        DROP TABLE IF EXISTS payments;
        DROP TABLE IF EXISTS odontograms;
        DROP TABLE IF EXISTS legacy_payment_map;
        DROP TABLE IF EXISTS legacy_treatment_map;
        DROP TABLE IF EXISTS legacy_patient_map;
        DROP TABLE IF EXISTS treatments;
        DROP TABLE IF EXISTS patients;
        DROP TABLE IF EXISTS import_anomalies;
        DROP TABLE IF EXISTS import_runs;
        
        PRAGMA foreign_keys = ON;
        "#,
    )
    .map_err(|e| format!("Error eliminando tablas: {}", e))?;

    // Recrear schema
    ensure_schema(conn)?;

    Ok(())
}

// ═══════════════════════════════════════════════════════════════════════════
// INSERCIÓN / UPSERT POR ENTIDAD
// ═══════════════════════════════════════════════════════════════════════════

fn ensure_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS import_runs (
            run_id TEXT PRIMARY KEY,
            source_path TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            status TEXT NOT NULL,
            metrics_json TEXT
        );

        CREATE TABLE IF NOT EXISTS import_anomalies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            run_id TEXT NOT NULL,
            severity TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            legacy_reference TEXT,
            message TEXT NOT NULL,
            details_json TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (run_id) REFERENCES import_runs(run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            legacy_patient_id TEXT,
            legacy_external_id TEXT,
            external_reference TEXT,
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
            created_at_legacy TEXT,
            updated_at_legacy TEXT,
            raw_data TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (legacy_patient_id),
            FOREIGN KEY (source_run_id) REFERENCES import_runs(run_id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_patients_document ON patients(document_number);
        CREATE INDEX IF NOT EXISTS idx_patients_source_run ON patients(source_run_id);

        CREATE TABLE IF NOT EXISTS legacy_patient_map (
            legacy_patient_id TEXT NOT NULL,
            patient_id INTEGER NOT NULL,
            run_id TEXT NOT NULL,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (legacy_patient_id, run_id),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (run_id) REFERENCES import_runs(run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS treatments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            legacy_treatment_id TEXT,
            legacy_patient_id TEXT,
            reference_code TEXT,
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
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
            FOREIGN KEY (source_run_id) REFERENCES import_runs(run_id) ON DELETE SET NULL
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_treatments_legacy_run ON treatments(legacy_treatment_id, source_run_id);
        CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);

        CREATE TABLE IF NOT EXISTS legacy_treatment_map (
            legacy_treatment_id TEXT NOT NULL,
            treatment_id INTEGER NOT NULL,
            patient_id INTEGER,
            run_id TEXT NOT NULL,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (legacy_treatment_id, run_id),
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
            FOREIGN KEY (run_id) REFERENCES import_runs(run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            treatment_id INTEGER,
            patient_id INTEGER,
            legacy_payment_id TEXT,
            legacy_treatment_id TEXT,
            legacy_patient_id TEXT,
            legacy_receipt_number TEXT,
            legacy_consecutive TEXT,
            legacy_concept TEXT,
            legacy_observations TEXT,
            amount REAL NOT NULL,
            payment_date TEXT,
            payment_method TEXT,
            notes TEXT,
            raw_data TEXT,
            orphan_reason TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (treatment_id) REFERENCES treatments(id) ON DELETE SET NULL,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
            FOREIGN KEY (source_run_id) REFERENCES import_runs(run_id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_payments_treatment ON payments(treatment_id);
        CREATE INDEX IF NOT EXISTS idx_payments_patient ON payments(patient_id);

        CREATE TABLE IF NOT EXISTS legacy_payment_map (
            legacy_payment_id TEXT NOT NULL,
            payment_id INTEGER NOT NULL,
            run_id TEXT NOT NULL,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (legacy_payment_id, run_id),
            FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
            FOREIGN KEY (run_id) REFERENCES import_runs(run_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS odontograms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            legacy_record_id TEXT,
            legacy_patient_id TEXT,
            legacy_treatment_id TEXT,
            legacy_budget_number TEXT,
            tooth_number TEXT NOT NULL,
            condition TEXT NOT NULL,
            notes TEXT,
            color TEXT,
            date TEXT,
            raw_data TEXT,
            source_run_id TEXT,
            source_record_hash TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
            FOREIGN KEY (source_run_id) REFERENCES import_runs(run_id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_odontograms_patient ON odontograms(patient_id);

        CREATE TABLE IF NOT EXISTS clinical_history_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            legacy_patient_id TEXT NOT NULL,
            legacy_filename TEXT NOT NULL,
            content_text TEXT,
            checksum TEXT,
            file_size INTEGER,
            encountered_error TEXT,
            run_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (run_id) REFERENCES import_runs(run_id) ON DELETE CASCADE,
            UNIQUE (legacy_filename, run_id)
        );
        "#,
    )
    .map_err(|e| format!("Error creando schema: {}", e))?;

    Ok(())
}

fn upsert_patient(tx: &Transaction, run_id: &str, patient: &PatientDto) -> Result<i64, String> {
    let raw_json = serde_json::to_string(&patient.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO patients (
            legacy_patient_id, legacy_external_id, external_reference,
            first_name, last_name, document_type, document_number,
            phone, email, address, city, postal_code,
            birth_date, gender, blood_type, allergies, medical_notes,
            created_at_legacy, updated_at_legacy,
            raw_data, source_run_id, source_record_hash,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3,
            ?4, ?5, ?6, ?7,
            ?8, ?9, ?10, ?11, ?12,
            ?13, ?14, ?15, ?16, ?17,
            ?18, ?19,
            ?20, ?21, ?22,
            ?23, ?24
        )
        ON CONFLICT(legacy_patient_id) DO UPDATE SET
            legacy_external_id = excluded.legacy_external_id,
            external_reference = excluded.external_reference,
            first_name = excluded.first_name,
            last_name = excluded.last_name,
            document_type = excluded.document_type,
            document_number = excluded.document_number,
            phone = excluded.phone,
            email = excluded.email,
            address = excluded.address,
            city = excluded.city,
            postal_code = excluded.postal_code,
            birth_date = excluded.birth_date,
            gender = excluded.gender,
            blood_type = excluded.blood_type,
            allergies = excluded.allergies,
            medical_notes = excluded.medical_notes,
            created_at_legacy = excluded.created_at_legacy,
            updated_at_legacy = excluded.updated_at_legacy,
            raw_data = excluded.raw_data,
            source_run_id = excluded.source_run_id,
            source_record_hash = excluded.source_record_hash,
            updated_at = excluded.updated_at
        "#,
        params![
            patient.legacy_patient_id,
            patient.legacy_external_id,
            patient.external_reference,
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
            patient.created_at_legacy,
            patient.last_updated_legacy,
            raw_json,
            run_id,
            patient.metadata.source_record_hash,
            now,
            now,
        ],
    )
    .map_err(|e| format!("Error insertando paciente: {}", e))?;

    Ok(tx.last_insert_rowid())
}

fn upsert_legacy_patient_map(
    tx: &Transaction,
    run_id: &str,
    legacy_patient_id: &str,
    patient_id: i64,
    metadata: &ImportRecordMetadata,
) -> Result<(), String> {
    tx.execute(
        r#"
        INSERT INTO legacy_patient_map (
            legacy_patient_id, patient_id, run_id, source_record_hash
        ) VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(legacy_patient_id, run_id) DO UPDATE SET
            patient_id = excluded.patient_id,
            source_record_hash = excluded.source_record_hash
        "#,
        params![
            legacy_patient_id,
            patient_id,
            run_id,
            metadata.source_record_hash,
        ],
    )
    .map(|_| ())
    .map_err(|e| format!("Error insertando mapa de pacientes: {}", e))
}

fn upsert_treatment(
    tx: &Transaction,
    run_id: &str,
    patient_id: Option<i64>,
    treatment: &TreatmentDto,
) -> Result<Option<i64>, String> {
    let raw_json = serde_json::to_string(&treatment.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO treatments (
            patient_id, legacy_treatment_id, legacy_patient_id, reference_code,
            name, description, tooth_number, sector, status,
            total_cost, paid_amount, balance,
            planned_date, started_date, completed_date,
            notes, raw_data, source_run_id, source_record_hash,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4,
            ?5, ?6, ?7, ?8, ?9,
            ?10, ?11, ?12,
            ?13, ?14, ?15,
            ?16, ?17, ?18, ?19,
            ?20, ?21
        )
        ON CONFLICT(legacy_treatment_id, source_run_id) DO UPDATE SET
            patient_id = excluded.patient_id,
            legacy_patient_id = excluded.legacy_patient_id,
            reference_code = excluded.reference_code,
            name = excluded.name,
            description = excluded.description,
            tooth_number = excluded.tooth_number,
            sector = excluded.sector,
            status = excluded.status,
            total_cost = excluded.total_cost,
            paid_amount = excluded.paid_amount,
            balance = excluded.balance,
            planned_date = excluded.planned_date,
            started_date = excluded.started_date,
            completed_date = excluded.completed_date,
            notes = excluded.notes,
            raw_data = excluded.raw_data,
            source_record_hash = excluded.source_record_hash,
            updated_at = excluded.updated_at
        "#,
        params![
            patient_id,
            treatment.legacy_treatment_id,
            treatment.legacy_patient_id,
            treatment.reference_code,
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
            raw_json,
            run_id,
            treatment.metadata.source_record_hash,
            now,
            now,
        ],
    )
    .map_err(|e| format!("Error insertando tratamiento: {}", e))?;

    let row_id = tx.last_insert_rowid();
    Ok(Some(row_id))
}

fn upsert_legacy_treatment_map(
    tx: &Transaction,
    run_id: &str,
    legacy_treatment_id: &str,
    treatment_id: i64,
    patient_id: Option<i64>,
    metadata: &ImportRecordMetadata,
) -> Result<(), String> {
    tx.execute(
        r#"
        INSERT INTO legacy_treatment_map (
            legacy_treatment_id, treatment_id, patient_id, run_id, source_record_hash
        ) VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(legacy_treatment_id, run_id) DO UPDATE SET
            treatment_id = excluded.treatment_id,
            patient_id = excluded.patient_id,
            source_record_hash = excluded.source_record_hash
        "#,
        params![
            legacy_treatment_id,
            treatment_id,
            patient_id,
            run_id,
            metadata.source_record_hash,
        ],
    )
    .map(|_| ())
    .map_err(|e| format!("Error insertando mapa de tratamientos: {}", e))
}

fn upsert_payment(
    tx: &Transaction,
    run_id: &str,
    patient_id: Option<i64>,
    treatment_id: Option<i64>,
    payment: &PaymentDto,
) -> Result<Option<i64>, String> {
    let raw_json = serde_json::to_string(&payment.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO payments (
            treatment_id, patient_id,
            legacy_payment_id, legacy_treatment_id, legacy_patient_id,
            legacy_receipt_number, legacy_consecutive, legacy_concept, legacy_observations,
            amount, payment_date, payment_method, notes,
            raw_data, orphan_reason, source_run_id, source_record_hash, created_at
        ) VALUES (
            ?1, ?2,
            ?3, ?4, ?5,
            ?6, ?7, ?8, ?9,
            ?10, ?11, ?12, ?13,
            ?14, ?15, ?16, ?17, ?18
        )
        "#,
        params![
            treatment_id,
            patient_id,
            payment.legacy_payment_id,
            payment.legacy_treatment_id,
            payment.legacy_patient_id,
            payment.legacy_receipt_number,
            payment.legacy_consecutive,
            payment.legacy_concept,
            payment.legacy_observations,
            payment.amount,
            payment.payment_date,
            payment.payment_method,
            payment.notes,
            raw_json,
            payment.orphan_reason,
            run_id,
            payment.metadata.source_record_hash,
            now,
        ],
    )
    .map_err(|e| format!("Error insertando pago: {}", e))?;

    let row_id = tx.last_insert_rowid();

    if let Some(ref legacy_id) = payment.legacy_payment_id {
        tx.execute(
            r#"
            INSERT INTO legacy_payment_map (
                legacy_payment_id, payment_id, run_id, source_record_hash
            ) VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(legacy_payment_id, run_id) DO UPDATE SET
                payment_id = excluded.payment_id,
                source_record_hash = excluded.source_record_hash
            "#,
            params![
                legacy_id,
                row_id,
                run_id,
                payment.metadata.source_record_hash,
            ],
        )
        .map_err(|e| format!("Error insertando mapa de pagos: {}", e))?;
    }

    Ok(Some(row_id))
}

fn upsert_odontogram(
    tx: &Transaction,
    run_id: &str,
    patient_id: Option<i64>,
    odontogram: &OdontogramDto,
) -> Result<Option<i64>, String> {
    let raw_json = serde_json::to_string(&odontogram.raw_data).unwrap_or_else(|_| "{}".to_string());
    let now = chrono::Utc::now().to_rfc3339();

    tx.execute(
        r#"
        INSERT INTO odontograms (
            patient_id, legacy_record_id, legacy_patient_id, legacy_treatment_id, legacy_budget_number,
            tooth_number, condition, notes, color, date,
            raw_data, source_run_id, source_record_hash,
            created_at, updated_at
        ) VALUES (
            ?1, ?2, ?3, ?4, ?5,
            ?6, ?7, ?8, ?9, ?10,
            ?11, ?12, ?13,
            ?14, ?15
        )
        "#,
        params![
            patient_id,
            odontogram.legacy_record_id,
            odontogram.legacy_patient_id,
            odontogram.legacy_treatment_id,
            odontogram.legacy_budget_number,
            odontogram.tooth_number,
            odontogram.condition,
            odontogram.notes,
            odontogram.color,
            odontogram.date,
            raw_json,
            run_id,
            odontogram.metadata.source_record_hash,
            now,
            now,
        ],
    )
    .map_err(|e| format!("Error insertando odontograma: {}", e))?;

    Ok(Some(tx.last_insert_rowid()))
}

fn upsert_history_document(
    tx: &Transaction,
    run_id: &str,
    patient_id: i64,
    doc: &ClinicalHistoryDocumentDto,
) -> Result<Option<i64>, String> {
    let content_text = doc.content_base64.as_deref();

    tx.execute(
        r#"
        INSERT INTO clinical_history_documents (
            patient_id, legacy_patient_id, legacy_filename,
            content_text, checksum, file_size,
            encountered_error, run_id
        ) VALUES (
            ?1, ?2, ?3,
            ?4, ?5, ?6,
            ?7, ?8
        )
        ON CONFLICT(legacy_filename, run_id) DO UPDATE SET
            patient_id = excluded.patient_id,
            content_text = excluded.content_text,
            checksum = excluded.checksum,
            file_size = excluded.file_size,
            encountered_error = excluded.encountered_error
        "#,
        params![
            patient_id,
            doc.legacy_patient_id,
            doc.legacy_filename,
            content_text,
            doc.checksum,
            doc.file_size.map(|v| v as i64),
            doc.encountered_error,
            run_id,
        ],
    )
    .map_err(|e| format!("Error insertando historia clinica: {}", e))?;

    Ok(Some(tx.last_insert_rowid()))
}

fn emit_progress(
    cb: &mut Option<&mut dyn FnMut(PersistProgress)>,
    stage: &'static str,
    current: usize,
    total: usize,
    message: impl Into<String>,
) {
    if let Some(cb) = cb.as_deref_mut() {
        cb(PersistProgress {
            stage,
            current,
            total,
            message: message.into(),
        });
    }
}
fn record_orphan_anomaly(
    tx: &Transaction,
    run_id: &str,
    entity_type: &str,
    legacy_reference: &str,
    message: &str,
    raw_data: &serde_json::Value,
) -> Result<(), String> {
    let anomaly = ImportAnomalyDto {
        severity: "warning".to_string(),
        entity_type: entity_type.to_string(),
        legacy_reference: Some(legacy_reference.to_string()),
        run_id: Some(run_id.to_string()),
        message: message.to_string(),
        details: raw_data.clone(),
    };
    insert_anomaly(tx, run_id, &anomaly)
}

fn insert_anomaly(
    tx: &Transaction,
    run_id: &str,
    anomaly: &ImportAnomalyDto,
) -> Result<(), String> {
    tx.execute(
        r#"
        INSERT INTO import_anomalies (
            run_id, severity, entity_type, legacy_reference, message, details_json
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        "#,
        params![
            run_id,
            anomaly.severity,
            anomaly.entity_type,
            anomaly.legacy_reference,
            anomaly.message,
            serde_json::to_string(&anomaly.details).unwrap_or_else(|_| "{}".to_string()),
        ],
    )
    .map(|_| ())
    .map_err(|e| format!("Error registrando anomalía: {}", e))
}

fn start_import_run(conn: &Connection, run_id: &str, source_path: &str) -> Result<(), String> {
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        r#"
        INSERT INTO import_runs (run_id, source_path, started_at, status)
        VALUES (?1, ?2, ?3, 'pending')
        ON CONFLICT(run_id) DO UPDATE SET
            source_path = excluded.source_path,
            started_at = excluded.started_at,
            status = 'pending'
        "#,
        params![run_id, source_path, now],
    )
    .map_err(|e| format!("Error iniciando registro de importación: {}", e))?;
    Ok(())
}

fn finalize_import_run(
    conn: &Connection,
    run_id: &str,
    status: &str,
    result: Option<&PersistResult>,
) -> Result<(), String> {
    let metrics_json = result.map(|res| {
        serde_json::json!({
            "patients": res.patients_inserted,
            "treatments": res.treatments_inserted,
            "payments": res.payments_inserted,
            "odontograms": res.odontograms_inserted,
            "history_documents": res.history_documents_inserted,
            "anomalies": res.anomalies_recorded
        })
        .to_string()
    });

    let finished_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        r#"
        UPDATE import_runs
        SET status = ?1,
            finished_at = ?2,
            metrics_json = COALESCE(?3, metrics_json)
        WHERE run_id = ?4
        "#,
        params![status, finished_at, metrics_json, run_id],
    )
    .map_err(|e| format!("Error finalizando run: {}", e))?;

    Ok(())
}
