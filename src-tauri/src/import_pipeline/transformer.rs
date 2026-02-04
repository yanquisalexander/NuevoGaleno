// Transformador: Convierte datos raw de Paradox a DTOs normalizados
// Etapa 2: Limpieza, normalización y construcción de relaciones con trazabilidad

use crate::import_pipeline::models::*;
use crate::import_pipeline::reader;
use crate::import_pipeline::ValidationIssue;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use rayon::prelude::*;
use walkdir::WalkDir;

/// Callback para reportar progreso durante la transformación
pub type ProgressCallback = Box<dyn Fn(String) + Send>;

/// Resultado de la transformación con datos procesados, huérfanos y anomalías
pub struct TransformationResult {
    pub patients: Vec<PatientDto>,
    pub orphan_treatments: Vec<TreatmentDto>,
    pub orphan_payments: Vec<PaymentDto>,
    pub orphan_odontograms: Vec<OdontogramDto>,
    pub anomalies: Vec<ImportAnomalyDto>,
    pub issues: Vec<ValidationIssue>,
}

struct LegacyMaps {
    patient_by_legacy: HashMap<String, String>, // legacy_patient_id -> patient_temp_id
    patient_index_by_temp: HashMap<String, usize>,
    treatment_by_legacy: HashMap<String, (String, String)>, // legacy_treatment_id -> (patient_temp_id, treatment_temp_id)
    treatment_index_by_temp: HashMap<String, (usize, usize)>, // treatment_temp_id -> (patient_index, treatment_index)
}

impl LegacyMaps {
    fn new() -> Self {
        Self {
            patient_by_legacy: HashMap::new(),
            patient_index_by_temp: HashMap::new(),
            treatment_by_legacy: HashMap::new(),
            treatment_index_by_temp: HashMap::new(),
        }
    }
}

/// Transforma datos raw de Paradox a DTOs estructurados con trazabilidad histórica
pub fn transform_raw_data(
    raw_data: &RawParadoxData,
    source_root: Option<&str>,
    progress_cb: Option<ProgressCallback>,
) -> Result<TransformationResult, String> {
    let mut issues = Vec::new();
    let mut anomalies = Vec::new();
    let mut patients = Vec::new();
    let mut orphan_treatments = Vec::new();
    let mut orphan_payments = Vec::new();
    let mut orphan_odontograms = Vec::new();

    if let Some(ref cb) = progress_cb {
        cb("🔄 Iniciando transformación de datos...".to_string());
    }

    // 1. Identificar tablas por contenido
    if let Some(ref cb) = progress_cb {
        cb("🔍 Identificando tablas de pacientes, tratamientos, pagos y odontogramas...".to_string());
    }

    let patients_table = reader::identify_patients_table(raw_data)
        .ok_or("No se pudo identificar la tabla de pacientes")?;

    let treatments_table = reader::identify_treatments_table(raw_data);
    let payments_table = reader::identify_payments_table(raw_data);
    let odontograms_table = reader::identify_odontograms_table(raw_data);

    issues.push(super::ValidationIssue::info(
        "system",
        "tables",
        format!(
            "Tablas identificadas - Pacientes: {}, Tratamientos: {}, Pagos: {}, Odontogramas: {}",
            patients_table.table_name,
            treatments_table
                .map(|t| t.table_name.as_str())
                .unwrap_or("ninguna"),
            payments_table
                .map(|t| t.table_name.as_str())
                .unwrap_or("ninguna"),
            odontograms_table
                .map(|t| t.table_name.as_str())
                .unwrap_or("ninguna"),
        ),
    ));

    if let Some(ref cb) = progress_cb {
        cb(format!(
            "👥 Transformando {} pacientes desde {}",
            patients_table.rows.len(),
            patients_table.table_name
        ));
    }

    let mut legacy_maps = LegacyMaps::new();

    let batch_size = 100; // Procesar pacientes en lotes de 100

    for (batch_idx, batch) in patients_table.rows.chunks(batch_size).enumerate() {
        if let Some(ref cb) = progress_cb {
            cb(format!(
                "👤 Procesando lote de pacientes {} de {} ({} pacientes)",
                batch_idx + 1,
                (patients_table.rows.len() + batch_size - 1) / batch_size,
                batch.len()
            ));
        }

        for (row_idx_in_batch, row) in batch.iter().enumerate() {
            let global_row_idx = batch_idx * batch_size + row_idx_in_batch;

            match transform_patient_row(row, patients_table, global_row_idx) {
            Ok(mut patient_dto) => {
                if let Some(legacy_id) = patient_dto.legacy_patient_id.clone() {
                    let key = legacy_id.clone();
                    if let Some(existing_temp_id) = legacy_maps.patient_by_legacy.get(&key) {
                        anomalies.push(build_anomaly(
                            "critical",
                            "patient",
                            Some(&legacy_id),
                            None,
                            format!(
                                "Clave de paciente '{}' duplicada; registros {} y {}",
                                legacy_id,
                                existing_temp_id,
                                patient_dto.temp_id
                            ),
                            serde_json::json!({
                                "existing_temp_id": existing_temp_id,
                                "duplicated_temp_id": patient_dto.temp_id
                            }),
                        ));
                        issues.push(super::ValidationIssue::error(
                            "patient",
                            &patient_dto.temp_id,
                            "legacy_patient_id",
                            format!("Clave legacy duplicada: {}", legacy_id),
                        ));
                    } else {
                        legacy_maps
                            .patient_by_legacy
                            .insert(key, patient_dto.temp_id.clone());
                    }
                    patient_dto
                        .metadata
                        .legacy_primary_key = Some(legacy_id.clone());
                }

                legacy_maps
                    .patient_index_by_temp
                    .insert(patient_dto.temp_id.clone(), patients.len());
                patients.push(patient_dto);
            }
            Err(err) => {
                anomalies.push(build_anomaly(
                    "error",
                    "patient",
                    None,
                    None,
                    format!("Paciente descartado por error de parseo: {}", err),
                    serde_json::Value::Null,
                ));
                issues.push(super::ValidationIssue::warning(
                    "patient",
                    "unknown",
                    "parsing",
                    format!("Paciente ignorado por error de parseo: {}", err),
                ));
            }
        }
    }
}

    // 2. Procesar tratamientos
    if let Some(treat_table) = treatments_table {
        if let Some(ref cb) = progress_cb {
            cb(format!(
                "🛠️ Asociando {} tratamientos legacy...",
                treat_table.rows.len()
            ));
        }

        for (row_idx, row) in treat_table.rows.iter().enumerate() {
            match transform_treatment_row(row, treat_table, row_idx) {
                Ok(mut treatment) => {
                    let legacy_patient_id = treatment
                        .legacy_patient_id
                        .clone()
                        .map(|v| normalize_legacy_key(&v));

                    if let Some(legacy_patient_id) = legacy_patient_id {
                        if let Some(patient_temp_id) = legacy_maps.patient_by_legacy.get(&legacy_patient_id) {
                            treatment.patient_temp_id = Some(patient_temp_id.clone());

                            if let Some(patient_index) = legacy_maps.patient_index_by_temp.get(patient_temp_id) {
                                let treatment_index = patients[*patient_index].treatments.len();

                                if let Some(legacy_treatment_id) = treatment
                                    .legacy_treatment_id
                                    .clone()
                                    .map(|v| normalize_legacy_key(&v))
                                {
                                    legacy_maps.treatment_by_legacy.insert(
                                        legacy_treatment_id,
                                        (patient_temp_id.clone(), treatment.temp_id.clone()),
                                    );
                                }

                                legacy_maps.treatment_index_by_temp.insert(
                                    treatment.temp_id.clone(),
                                    (*patient_index, treatment_index),
                                );

                                patients[*patient_index].treatments.push(treatment);
                            } else {
                                anomalies.push(build_anomaly(
                                    "error",
                                    "treatment",
                                    treatment
                                        .legacy_treatment_id
                                        .as_ref()
                                        .map(|s| s.as_str()),
                                    None,
                                    "Tratamiento con paciente temp no localizado".to_string(),
                                    serde_json::json!({
                                        "patient_temp_id": patient_temp_id
                                    }),
                                ));
                                orphan_treatments.push(treatment);
                            }
                        } else {
                            anomalies.push(build_anomaly(
                                "error",
                                "treatment",
                                treatment
                                    .legacy_treatment_id
                                    .as_ref()
                                    .map(|s| s.as_str()),
                                None,
                                format!(
                                    "Tratamiento sin paciente legacy mapeado (clave: {})",
                                    legacy_patient_id
                                ),
                                serde_json::json!({ "legacy_patient_id": legacy_patient_id }),
                            ));
                            orphan_treatments.push(treatment);
                        }
                    } else {
                        anomalies.push(build_anomaly(
                            "warning",
                            "treatment",
                            treatment
                                .legacy_treatment_id
                                .as_ref()
                                .map(|s| s.as_str()),
                            None,
                            "Tratamiento sin clave legacy de paciente".to_string(),
                            serde_json::Value::Null,
                        ));
                        orphan_treatments.push(treatment);
                    }
                }
                Err(err) => {
                    anomalies.push(build_anomaly(
                        "error",
                        "treatment",
                        None,
                        None,
                        format!("Registro de tratamiento descartado: {}", err),
                        serde_json::Value::Null,
                    ));
                }
            }

            if let Some(ref cb) = progress_cb {
                if row_idx % 50 == 0 {
                    cb(format!("🛠️ Tratamientos procesados: {}", row_idx + 1));
                }
            }
        }
    }

    // 3. Procesar pagos
    if let Some(pay_table) = payments_table {
        if let Some(ref cb) = progress_cb {
            cb(format!("💳 Integrando {} pagos...", pay_table.rows.len()));
        }

        for (row_idx, row) in pay_table.rows.iter().enumerate() {
            match transform_payment_row(row, pay_table, row_idx) {
                Ok(mut payment) => {
                    let legacy_treatment_key = payment
                        .legacy_treatment_id
                        .clone()
                        .map(|v| normalize_legacy_key(&v));
                    let legacy_patient_key = payment
                        .legacy_patient_id
                        .clone()
                        .map(|v| normalize_legacy_key(&v));

                    if let Some(legacy_treatment_key) = legacy_treatment_key {
                        if let Some((patient_temp_id, treatment_temp_id)) = legacy_maps
                            .treatment_by_legacy
                            .get(&legacy_treatment_key)
                        {
                            payment.treatment_temp_id = Some(treatment_temp_id.clone());
                            payment.metadata.legacy_primary_key = Some(legacy_treatment_key.clone());

                            if let Some((patient_index, treatment_index)) = legacy_maps
                                .treatment_index_by_temp
                                .get(treatment_temp_id)
                            {
                                patients[*patient_index].treatments[*treatment_index]
                                    .payments
                                    .push(payment);
                            } else {
                                anomalies.push(build_anomaly(
                                    "error",
                                    "payment",
                                    payment
                                        .legacy_payment_id
                                        .as_ref()
                                        .map(|s| s.as_str()),
                                    None,
                                    "Pago no pudo asociarse a tratamiento por índice".to_string(),
                                    serde_json::json!({
                                        "treatment_temp_id": treatment_temp_id,
                                        "patient_temp_id": patient_temp_id
                                    }),
                                ));
                                orphan_payments.push(payment);
                            }
                        } else {
                            payment.orphan_reason = Some("legacy_treatment_missing".to_string());
                            anomalies.push(build_anomaly(
                                "warning",
                                "payment",
                                payment
                                    .legacy_payment_id
                                    .as_ref()
                                    .map(|s| s.as_str()),
                                None,
                                "Pago sin tratamiento legacy conocido".to_string(),
                                serde_json::json!({
                                    "legacy_treatment_id": legacy_treatment_key,
                                    "legacy_patient_id": legacy_patient_key
                                }),
                            ));
                            if let Some(legacy_patient_key) = legacy_patient_key.clone() {
                                if let Some(patient_temp_id) = legacy_maps
                                    .patient_by_legacy
                                    .get(&legacy_patient_key)
                                {
                                    if let Some(patient_index) = legacy_maps
                                        .patient_index_by_temp
                                        .get(patient_temp_id)
                                    {
                                        patients[*patient_index].orphan_payments.push(payment);
                                    } else {
                                        orphan_payments.push(payment);
                                    }
                                } else {
                                    orphan_payments.push(payment);
                                }
                            } else {
                                orphan_payments.push(payment);
                            }
                        }
                    } else {
                        payment.orphan_reason = Some("legacy_treatment_id_missing".to_string());
                        anomalies.push(build_anomaly(
                            "warning",
                            "payment",
                            payment
                                .legacy_payment_id
                                .as_ref()
                                .map(|s| s.as_str()),
                            None,
                            "Pago sin clave de tratamiento".to_string(),
                            serde_json::Value::Null,
                        ));

                        if let Some(legacy_patient_key) = legacy_patient_key.clone() {
                            if let Some(patient_temp_id) = legacy_maps
                                .patient_by_legacy
                                .get(&legacy_patient_key)
                            {
                                if let Some(patient_index) = legacy_maps
                                    .patient_index_by_temp
                                    .get(patient_temp_id)
                                {
                                    patients[*patient_index].orphan_payments.push(payment);
                                } else {
                                    orphan_payments.push(payment);
                                }
                            } else {
                                orphan_payments.push(payment);
                            }
                        } else {
                            orphan_payments.push(payment);
                        }
                    }
                }
                Err(err) => {
                    anomalies.push(build_anomaly(
                        "error",
                        "payment",
                        None,
                        None,
                        format!("Pago descartado por error de parseo: {}", err),
                        serde_json::Value::Null,
                    ));
                }
            }

            if let Some(ref cb) = progress_cb {
                if row_idx % 100 == 0 {
                    cb(format!("💳 Pagos procesados: {}", row_idx + 1));
                }
            }
        }
    }

    // 4. Procesar odontogramas
    if let Some(odonto_table) = odontograms_table {
        if let Some(ref cb) = progress_cb {
            cb(format!(
                "🦷 Importando {} registros de odontograma...",
                odonto_table.rows.len()
            ));
        }

        for (row_idx, row) in odonto_table.rows.iter().enumerate() {
            match transform_odontogram_row(row, odonto_table, row_idx) {
                Ok(mut odontogram) => {
                    let legacy_patient_key = odontogram
                        .legacy_patient_id
                        .clone()
                        .map(|v| normalize_legacy_key(&v));

                    if let Some(legacy_patient_key) = legacy_patient_key {
                        if let Some(patient_temp_id) = legacy_maps
                            .patient_by_legacy
                            .get(&legacy_patient_key)
                        {
                            odontogram.patient_temp_id = Some(patient_temp_id.clone());
                            if let Some(patient_index) = legacy_maps
                                .patient_index_by_temp
                                .get(patient_temp_id)
                            {
                                patients[*patient_index].odontograms.push(odontogram);
                            } else {
                                orphan_odontograms.push(odontogram);
                            }
                        } else {
                            anomalies.push(build_anomaly(
                                "warning",
                                "odontogram",
                                odontogram
                                    .legacy_record_id
                                    .as_ref()
                                    .map(|s| s.as_str()),
                                None,
                                format!(
                                    "Odontograma sin paciente mapeado (clave: {})",
                                    legacy_patient_key
                                ),
                                serde_json::Value::Null,
                            ));
                            orphan_odontograms.push(odontogram);
                        }
                    } else {
                        anomalies.push(build_anomaly(
                            "warning",
                            "odontogram",
                            odontogram
                                .legacy_record_id
                                .as_ref()
                                .map(|s| s.as_str()),
                            None,
                            "Odontograma sin clave legacy de paciente".to_string(),
                            serde_json::Value::Null,
                        ));
                        orphan_odontograms.push(odontogram);
                    }
                }
                Err(err) => {
                    anomalies.push(build_anomaly(
                        "error",
                        "odontogram",
                        None,
                        None,
                        format!("Registro de odontograma descartado: {}", err),
                        serde_json::Value::Null,
                    ));
                }
            }

            if let Some(ref cb) = progress_cb {
                if row_idx % 100 == 0 {
                    cb(format!("🦷 Odontogramas procesados: {}", row_idx + 1));
                }
            }
        }
    }

    // 5. Cargar historias clínicas
    if let Err(err) = collect_history_documents(
        source_root,
        &mut patients,
        &legacy_maps.patient_by_legacy,
        &legacy_maps.patient_index_by_temp,
        &mut anomalies,
        &progress_cb,
    ) {
        anomalies.push(build_anomaly(
            "warning",
            "clinical_history",
            None,
            None,
            format!("No se pudieron procesar historias clínicas: {}", err),
            serde_json::Value::Null,
        ));
    }

    // 6. Recalcular saldos post-pagos
    for patient in &mut patients {
        for treatment in &mut patient.treatments {
            if !treatment.payments.is_empty() {
                let paid: f64 = treatment.payments.iter().map(|p| p.amount).sum();
                treatment.paid_amount = paid;
            }
            treatment.recalculate_balance();
        }
    }

    if let Some(ref cb) = progress_cb {
        cb(format!("✅ Transformación completada: {} pacientes válidos", patients.len()));
    }

    Ok(TransformationResult {
        patients,
        orphan_treatments,
        orphan_payments,
        orphan_odontograms,
        anomalies,
        issues,
    })
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMADORES INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════

fn transform_patient_row(
    row: &serde_json::Map<String, serde_json::Value>,
    table: &RawTable,
    row_idx: usize,
) -> Result<PatientDto, String> {
    let mut patient = PatientDto::new_with_temp_id();
    patient.raw_data = serde_json::Value::Object(row.clone());
    patient.metadata.source_table = Some(table.table_name.clone());
    patient.metadata.source_file = Some(table.file_name.clone());
    patient.metadata.source_row_index = Some(row_idx);
    patient.metadata.extracted_at = Some(now_timestamp());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let mut value_str = get_json_value_as_string(value);
        let trimmed = value_str.trim();

        match key_lower.as_str() {
            k if k.contains("clavpac") || k.contains("clavepac") || (k == "clave" && trimmed.len() >= 1) => {
                let legacy_key = normalize_legacy_key(trimmed);
                if !legacy_key.is_empty() {
                    patient.legacy_patient_id = Some(legacy_key.clone());
                    patient.metadata.legacy_primary_key = Some(legacy_key);
                }
            }
            k if k.contains("idexterno") || k.contains("external") => {
                let legacy_key = normalize_legacy_key(trimmed);
                if !legacy_key.is_empty() {
                    patient.legacy_external_id = Some(legacy_key);
                }
            }
            k if k.contains("referencia") || k.contains("ref") => {
                if !trimmed.is_empty() {
                    patient.external_reference = Some(trimmed.to_string());
                }
            }
            k if k.contains("nombre") && !k.contains("apellido") => {
                patient.first_name = normalize_text(trimmed);
            }
            k if k.contains("apellido") => {
                patient.last_name = normalize_text(trimmed);
            }
            k if (k.contains("documento") || k.contains("dni") || k.contains("cedula"))
                && !k.contains("clave")
                && !k.contains("tipo")
                && !k.contains("civil")
                && !k.contains("estado")
            => {
                let doc = normalize_document(trimmed);
                if !doc.is_empty() {
                    patient.document_number = Some(doc);
                }
            }
            k if k.contains("tipodoc") || k.contains("document_type") => {
                if !trimmed.is_empty() {
                    patient.document_type = Some(trimmed.to_string());
                }
            }
            k if k.contains("telefono") || k.contains("phone") || k.contains("celular") => {
                let phone = normalize_phone(trimmed);
                if !phone.is_empty() {
                    patient.phone = Some(phone);
                }
            }
            k if k.contains("email") || k.contains("correo") || k.contains("mail") => {
                if !trimmed.is_empty() {
                    patient.email = Some(normalize_email(trimmed));
                }
            }
            k if k.contains("direccion") || k.contains("address") || k.contains("domicilio") => {
                if !trimmed.is_empty() {
                    patient.address = Some(normalize_text(trimmed));
                }
            }
            k if k.contains("ciudad") || k.contains("city") => {
                if !trimmed.is_empty() {
                    patient.city = Some(normalize_text(trimmed));
                }
            }
            k if k.contains("postal") || k.contains("cp") || k.contains("zip") => {
                if !trimmed.is_empty() {
                    patient.postal_code = Some(trimmed.to_string());
                }
            }
            k if k.contains("fecha_nac") || k.contains("nacimiento") || k.contains("birth") => {
                patient.birth_date = parse_legacy_date(trimmed);
            }
            k if k.contains("sexo") || k.contains("genero") || k.contains("gender") => {
                if !trimmed.is_empty() {
                    patient.gender = Some(normalize_gender(trimmed));
                }
            }
            k if k.contains("sangre") || k.contains("blood") => {
                if !trimmed.is_empty() {
                    patient.blood_type = Some(trimmed.to_string());
                }
            }
            k if k.contains("alergia") || k.contains("allergy") => {
                if !trimmed.is_empty() {
                    patient.allergies = Some(trimmed.to_string());
                }
            }
            k if k.contains("nota") || k.contains("observ") => {
                if !trimmed.is_empty() {
                    value_str = trimmed.to_string();
                    patient.medical_notes = Some(value_str);
                }
            }
            k if k.contains("creado") || k.contains("fechacreac") => {
                patient.created_at_legacy = parse_legacy_date(trimmed);
            }
            k if k.contains("modificado") || k.contains("updated") => {
                patient.last_updated_legacy = parse_legacy_date(trimmed);
            }
            _ => {}
        }
    }

    // Asegurar nombres válidos
    if patient.last_name.is_empty() && !patient.first_name.is_empty() {
        let parts: Vec<&str> = patient.first_name.split_whitespace().collect();
        if parts.len() >= 2 {
            patient.last_name = parts.last().unwrap().to_string();
            patient.first_name = parts[..parts.len() - 1].join(" ");
        } else {
            patient.last_name = "Paciente".to_string();
        }
    }

    if patient.first_name.is_empty() && patient.last_name.is_empty() {
        if let Some(ref doc) = patient.document_number {
            patient.first_name = "Paciente".to_string();
            patient.last_name = doc.clone();
        } else if let Some(ref legacy_id) = patient.legacy_patient_id {
            patient.first_name = "Paciente".to_string();
            patient.last_name = format!("#{}", legacy_id);
        } else {
            patient.first_name = "Paciente".to_string();
            patient.last_name = "Sin datos".to_string();
        }
    }

    patient.metadata.source_record_hash = Some(compute_row_hash(row));

    Ok(patient)
}

fn transform_treatment_row(
    row: &serde_json::Map<String, serde_json::Value>,
    table: &RawTable,
    row_idx: usize,
) -> Result<TreatmentDto, String> {
    let mut treatment = TreatmentDto::new_with_temp_id(None);
    treatment.raw_data = serde_json::Value::Object(row.clone());
    treatment.metadata.source_table = Some(table.table_name.clone());
    treatment.metadata.source_file = Some(table.file_name.clone());
    treatment.metadata.source_row_index = Some(row_idx);
    treatment.metadata.extracted_at = Some(now_timestamp());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let trimmed = get_json_value_as_string(value);
        let trimmed = trimmed.trim();

        match key_lower.as_str() {
            k if k.contains("notrat") || (k.contains("trat") && k.contains("id")) || k == "id" => {
                let legacy = normalize_legacy_key(trimmed);
                if !legacy.is_empty() {
                    treatment.legacy_treatment_id = Some(legacy.clone());
                    treatment.metadata.legacy_primary_key = Some(legacy);
                }
            }
            k if k.contains("clavepac") || k.contains("clavpac") || (k == "clave" && trimmed.len() >= 1) => {
                let legacy = normalize_legacy_key(trimmed);
                if !legacy.is_empty() {
                    treatment.legacy_patient_id = Some(legacy);
                }
            }
            k if k.contains("descripcion") || k.contains("descripcio") || k.contains("description") => {
                if !trimmed.is_empty() {
                    treatment.description = Some(trimmed.to_string());
                    // Si no tiene nombre, usar descripción como nombre
                    if treatment.name.is_empty() {
                        treatment.name = normalize_text(trimmed);
                    }
                }
            }
            k if k.contains("categoria") || k.contains("category") => {
                if !trimmed.is_empty() {
                    treatment.sector = Some(trimmed.to_string());
                }
            }
            k if k.contains("tipo") && !k.contains("precio") => {
                if !trimmed.is_empty() {
                    treatment.status = TreatmentStatus::from_legacy_value(trimmed);
                }
            }
            k if k.contains("precio") || k.contains("costo") || k.contains("price") || k.contains("amount") => {
                treatment.total_cost = parse_currency(trimmed);
            }
            k if k.contains("honorario") => {
                treatment.notes = Some(format!(
                    "Honorarios legacy: {}",
                    trimmed
                ));
            }
            k if k.contains("referencia") => {
                if !trimmed.is_empty() {
                    treatment.reference_code = Some(trimmed.to_string());
                }
            }
            k if k.contains("concepto") || k.contains("nombre") || k.contains("tratamiento") => {
                if !trimmed.is_empty() {
                    treatment.name = normalize_text(trimmed);
                }
            }
            k if k.contains("nodiente") || k.contains("diente") || k.contains("tooth") => {
                if !trimmed.is_empty() {
                    treatment.tooth_number = Some(trimmed.to_string());
                }
            }
            k if k.contains("fecha_plan") || k.contains("planificada") => {
                treatment.planned_date = parse_legacy_date(trimmed);
            }
            k if k.contains("fecha_ini") || k.contains("inicio") => {
                treatment.started_date = parse_legacy_date(trimmed);
            }
            k if k.contains("fecha_fin") || k.contains("termino") || k.contains("complet") => {
                treatment.completed_date = parse_legacy_date(trimmed);
            }
            k if k.contains("pagado") => {
                treatment.paid_amount = parse_currency(trimmed);
            }
            k if k.contains("saldo") || k.contains("balance") || k.contains("debe") => {
                treatment.balance = parse_currency(trimmed);
            }
            k if k.contains("nota") || k.contains("observ") => {
                if !trimmed.is_empty() {
                    treatment.notes = Some(trimmed.to_string());
                }
            }
            _ => {}
        }
    }

    if treatment.name.trim().is_empty() {
        treatment.name = "Tratamiento sin nombre".to_string();
    }

    treatment.metadata.source_record_hash = Some(compute_row_hash(row));

    Ok(treatment)
}

fn transform_payment_row(
    row: &serde_json::Map<String, serde_json::Value>,
    table: &RawTable,
    row_idx: usize,
) -> Result<PaymentDto, String> {
    let mut payment = PaymentDto::new_with_temp_id(None);
    payment.raw_data = serde_json::Value::Object(row.clone());
    payment.metadata.source_table = Some(table.table_name.clone());
    payment.metadata.source_file = Some(table.file_name.clone());
    payment.metadata.source_row_index = Some(row_idx);
    payment.metadata.extracted_at = Some(now_timestamp());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let trimmed = get_json_value_as_string(value);
        let trimmed = trimmed.trim();

        match key_lower.as_str() {
            k if k.contains("consecutivo") => {
                if !trimmed.is_empty() {
                    payment.legacy_consecutive = Some(trimmed.to_string());
                }
            }
            k if (k == "clave" || k.contains("clavepac")) && !trimmed.is_empty() => {
                let legacy = normalize_legacy_key(trimmed);
                if !legacy.is_empty() {
                    payment.legacy_patient_id = Some(legacy);
                }
            }
            k if k.contains("clavetratam") || k.contains("tratam") || k.contains("notrat") => {
                let legacy = normalize_legacy_key(trimmed);
                if !legacy.is_empty() {
                    payment.legacy_treatment_id = Some(legacy);
                }
            }
            k if k.contains("norecibo") || k.contains("recibo") || k.contains("receipt") => {
                if !trimmed.is_empty() {
                    payment.legacy_receipt_number = Some(trimmed.to_string());
                }
            }
            k if k.contains("concepto") => {
                if !trimmed.is_empty() {
                    payment.legacy_concept = Some(trimmed.to_string());
                }
            }
            k if k.contains("observ") || k.contains("nota") => {
                if !trimmed.is_empty() {
                    payment.legacy_observations = Some(trimmed.to_string());
                }
            }
            k if k.contains("fecha") || k.contains("date") => {
                payment.payment_date = parse_legacy_date(trimmed);
            }
            k if k.contains("monto") || k.contains("importe") || k.contains("amount") || k.contains("pago") => {
                payment.amount = parse_currency(trimmed);
            }
            k if k.contains("metodo") || k.contains("forma") || k.contains("method") => {
                if !trimmed.is_empty() {
                    payment.payment_method = Some(trimmed.to_string());
                }
            }
            k if k == "id" || k.contains("id_pago") || k.contains("idpago") => {
                if !trimmed.is_empty() {
                    payment.legacy_payment_id = Some(normalize_legacy_key(trimmed));
                }
            }
            _ => {}
        }
    }

    payment.metadata.source_record_hash = Some(compute_row_hash(row));

    Ok(payment)
}

fn transform_odontogram_row(
    row: &serde_json::Map<String, serde_json::Value>,
    table: &RawTable,
    row_idx: usize,
) -> Result<OdontogramDto, String> {
    let mut odontogram = OdontogramDto::new_with_temp_id(None);
    odontogram.raw_data = serde_json::Value::Object(row.clone());
    odontogram.metadata.source_table = Some(table.table_name.clone());
    odontogram.metadata.source_file = Some(table.file_name.clone());
    odontogram.metadata.source_row_index = Some(row_idx);
    odontogram.metadata.extracted_at = Some(now_timestamp());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let trimmed = get_json_value_as_string(value);
        let trimmed = trimmed.trim();

        match key_lower.as_str() {
            k if k.contains("clavepac") || k.contains("clavpac") => {
                if !trimmed.is_empty() {
                    odontogram.legacy_patient_id = Some(normalize_legacy_key(trimmed));
                }
            }
            k if k.contains("notrata") || k.contains("tratam") => {
                if !trimmed.is_empty() {
                    odontogram.legacy_treatment_id = Some(normalize_legacy_key(trimmed));
                }
            }
            k if k.contains("consecutivo") || k.contains("consec") => {
                if !trimmed.is_empty() {
                    odontogram.legacy_record_id = Some(normalize_legacy_key(trimmed));
                }
            }
            k if k.contains("presupuesto") => {
                if !trimmed.is_empty() {
                    odontogram.legacy_budget_number = Some(trimmed.to_string());
                }
            }
            k if k.contains("nodiente") || k.contains("diente") || k.contains("tooth") => {
                odontogram.tooth_number = trimmed.to_string();
            }
            k if k.contains("tipo") || k.contains("concepto") || k.contains("condition") => {
                odontogram.condition = trimmed.to_string();
            }
            k if k.contains("color") => {
                if !trimmed.is_empty() {
                    odontogram.color = Some(trimmed.to_string());
                }
            }
            k if k.contains("avance") => {
                if !trimmed.is_empty() {
                    odontogram.notes = Some(format!("Avance: {}", trimmed));
                }
            }
            k if k.contains("concepto") || k.contains("observ") || k.contains("nota") => {
                if !trimmed.is_empty() {
                    odontogram.notes = Some(trimmed.to_string());
                }
            }
            k if k.contains("fecha") || k.contains("date") => {
                odontogram.date = parse_legacy_date(trimmed);
            }
            _ => {}
        }
    }

    if odontogram.tooth_number.is_empty() {
        return Err("Registro de odontograma sin número de diente".to_string());
    }

    odontogram.metadata.source_record_hash = Some(compute_row_hash(row));

    Ok(odontogram)
}

// ═══════════════════════════════════════════════════════════════════════════
// HISTORIAS CLÍNICAS
// ═══════════════════════════════════════════════════════════════════════════

fn process_single_history_file(
    file_path: &Path,
    patient_by_legacy: &HashMap<String, String>,
    patient_index_by_temp: &HashMap<String, usize>,
) -> Result<Option<(usize, ClinicalHistoryDocumentDto)>, ImportAnomalyDto> {
    let file_name = match file_path.file_name().and_then(|n| n.to_str()) {
        Some(name) => name.to_string(),
        None => return Ok(None),
    };

    let extension = file_path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    // NUEVA LÓGICA: Si es un .doc, buscar primero si existe su versión .txt
    let actual_file_path = if extension == "doc" {
        let txt_path = file_path.with_extension("txt");
        if txt_path.exists() {
            txt_path
        } else {
            file_path.to_path_buf()
        }
    } else {
        file_path.to_path_buf()
    };

    let legacy_key = actual_file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .map(|s| normalize_legacy_key(s))
        .unwrap_or_default();

    if legacy_key.is_empty() {
        let anomaly = build_anomaly(
            "warning",
            "clinical_history",
            None,
            None,
            format!(
                "Archivo de historia clínica sin clave legacy discernible: {}",
                file_name
            ),
            serde_json::Value::Null,
        );
        return Err(anomaly);
    }

    let patient_temp_id = match patient_by_legacy.get(&legacy_key) {
        Some(temp_id) => temp_id.clone(),
        None => {
            let anomaly = build_anomaly(
                "warning",
                "clinical_history",
                Some(&legacy_key),
                None,
                "Historia clínica sin paciente importado".to_string(),
                serde_json::json!({ "file": file_name }),
            );
            return Err(anomaly);
        }
    };

    let patient_index = match patient_index_by_temp.get(&patient_temp_id) {
        Some(idx) => *idx,
        None => {
            let anomaly = build_anomaly(
                "error",
                "clinical_history",
                Some(&legacy_key),
                Some(&patient_temp_id),
                "Historia clínica con paciente no encontrado en índice".to_string(),
                serde_json::json!({ "file": file_name }),
            );
            return Err(anomaly);
        }
    };

    // Leer el documento
    match read_history_document_as_text(&actual_file_path) {
        Ok(doc_info) => {
            let doc_dto = ClinicalHistoryDocumentDto::new(legacy_key.clone(), file_name.clone());
            let doc_dto = ClinicalHistoryDocumentDto {
                temp_id: doc_dto.temp_id,
                legacy_patient_id: legacy_key.clone(),
                legacy_filename: file_name.clone(),
                mime_type: infer_mime_from_extension(&actual_file_path),
                checksum: Some(doc_info.sha256),
                content_base64: Some(BASE64_STANDARD.encode(&doc_info.text_content)),
                file_size: Some(doc_info.file_size),
                encountered_error: None,
                metadata: ImportRecordMetadata {
                    run_id: None,
                    source_table: None,
                    source_file: Some(actual_file_path.to_string_lossy().to_string()),
                    source_path: None,
                    source_row_index: None,
                    legacy_primary_key: Some(legacy_key.clone()),
                    source_record_hash: None,
                    extracted_at: Some(now_timestamp()),
                },
            };

            Ok(Some((patient_index, doc_dto)))
        }
        Err(e) => {
            let anomaly = build_anomaly(
                "error",
                "clinical_history",
                Some(&legacy_key),
                Some(&patient_temp_id),
                format!("Error leyendo historia clínica {}: {}", file_name, e),
                serde_json::json!({ "error": e }),
            );
            Err(anomaly)
        }
    }
}

fn collect_history_documents(
    source_root: Option<&str>,
    patients: &mut [PatientDto],
    patient_by_legacy: &HashMap<String, String>,
    patient_index_by_temp: &HashMap<String, usize>,
    anomalies: &mut Vec<ImportAnomalyDto>,
    progress_cb: &Option<ProgressCallback>,
) -> Result<(), String> {
    let root = match source_root {
        Some(path) => PathBuf::from(path),
        None => return Ok(()),
    };

    let history_dir = root
        .join("GALENO~1")
        .join("Historias Clinicas");

    if !history_dir.exists() {
        return Ok(());
    }

    if let Some(ref cb) = progress_cb {
        cb("📁 Analizando historias clínicas legacy...".to_string());
    }

    // Recopilar todos los archivos primero
    let files: Vec<PathBuf> = WalkDir::new(&history_dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e: Result<walkdir::DirEntry, walkdir::Error>| e.ok())
        .filter(|e: &walkdir::DirEntry| e.file_type().is_file())
        .map(|e: walkdir::DirEntry| e.path().to_path_buf())
        .collect();

    if let Some(ref cb) = progress_cb {
        cb(format!("📁 Procesando {} historias clínicas...", files.len()));
    }

    // Procesar archivos en paralelo
    let results: Vec<Result<Option<(usize, ClinicalHistoryDocumentDto)>, ImportAnomalyDto>> = files
        .par_iter()
        .enumerate()
        .map(|(_idx, file_path)| {
            process_single_history_file(file_path, patient_by_legacy, patient_index_by_temp)
        })
        .collect();

    if let Some(ref cb) = progress_cb {
        cb(format!("📄 Procesadas {} historias clínicas en paralelo", files.len()));
    }

    // Aplicar resultados
    for result in results {
        match result {
            Ok(Some((patient_index, doc_dto))) => {
                patients[patient_index].history_documents.push(doc_dto);
            }
            Ok(None) => {
                // Archivo omitido, no hacer nada
            }
            Err(anomaly) => {
                anomalies.push(anomaly);
            }
        }
    }

    Ok(())
}

struct HistoryDocInfo {
    text_content: String,
    file_size: u64,
    sha256: String,
}

fn read_history_document_as_text(path: &Path) -> Result<HistoryDocInfo, String> {
    const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB límite (aumentado)
    
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Error leyendo metadatos de {}: {}", path.display(), e))?;
    let file_size = metadata.len();
    
    // Si el archivo es demasiado grande, no lo leemos
    if file_size > MAX_FILE_SIZE {
        return Err(format!(
            "Archivo demasiado grande ({:.2} MB). Máximo permitido: 10 MB",
            file_size as f64 / (1024.0 * 1024.0)
        ));
    }

    let data = fs::read(path)
        .map_err(|e| format!("Error leyendo archivo {}: {}", path.display(), e))?;

    let mut hasher = Sha256::new();
    hasher.update(&data);
    let checksum = format!("{:x}", hasher.finalize());
    
    // Extraer texto según el tipo de archivo
    let text_content = extract_text_from_document(path, &data)?;

    Ok(HistoryDocInfo {
        text_content,
        file_size,
        sha256: checksum,
    })
}

fn extract_text_from_document(path: &Path, data: &[u8]) -> Result<String, String> {
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    match extension.as_str() {
        "txt" | "log" => {
            // Archivos de texto plano - leer directamente
            extract_plain_text(data)
        }
        "rtf" => {
            // RTF - intentar extraer texto básico
            extract_rtf_text(data)
        }
        "doc" | "docx" => {
            // Word - usar pandoc para conversión a texto plano
            extract_word_text_with_pandoc(data)
        }
        _ => {
            // Por defecto, intentar como texto plano
            extract_plain_text(data)
        }
    }
}

fn extract_plain_text(data: &[u8]) -> Result<String, String> {
    // Intentar UTF-8 primero
    if let Ok(text) = String::from_utf8(data.to_vec()) {
        return Ok(clean_text(&text));
    }
    
    // Intentar Windows-1252 / Latin1
    let decoded = encoding_rs::WINDOWS_1252.decode(data).0;
    Ok(clean_text(&decoded))
}

fn extract_rtf_text(data: &[u8]) -> Result<String, String> {
    let rtf_str = extract_plain_text(data)?;
    
    // RTF básico: eliminar comandos de control
    let mut result = String::new();
    let mut in_control = false;
    let mut brace_level = 0;
    
    for ch in rtf_str.chars() {
        match ch {
            '{' => brace_level += 1,
            '}' => brace_level -= 1,
            '\\' => in_control = true,
            ' ' | '\n' | '\r' if in_control => {
                in_control = false;
            }
            _ if !in_control && brace_level <= 1 && ch.is_alphanumeric() || ch.is_whitespace() || ".,;:!?()[]\"'".contains(ch) => {
                result.push(ch);
            }
            _ => {}
        }
    }
    
    Ok(clean_text(&result))
}

fn extract_word_text_with_pandoc(data: &[u8]) -> Result<String, String> {
    // Usar pandoc para convertir .doc/.docx a texto plano
    // Crear archivo temporal para el input
    let temp_input = tempfile::NamedTempFile::new()
        .map_err(|e| format!("Error creando archivo temporal: {}", e))?;
    
    // Escribir datos al archivo temporal
    std::fs::write(&temp_input, data)
        .map_err(|e| format!("Error escribiendo archivo temporal: {}", e))?;
    
    // Ejecutar pandoc para convertir a texto plano
    let output = std::process::Command::new("pandoc")
        .args(&[
            "-f", "doc",  // formato de entrada (doc para .doc antiguos)
            "-t", "plain", // formato de salida: texto plano
            "--wrap=none", // no wrappear líneas
            temp_input.path().to_str().unwrap()
        ])
        .output()
        .map_err(|e| format!("Error ejecutando pandoc (¿está instalado?): {}", e))?;
    
    if output.status.success() {
        let text = String::from_utf8_lossy(&output.stdout).to_string();
        let cleaned = clean_text(&text);
        
        if cleaned.len() < 10 {
            return Err("Contenido extraído demasiado corto o vacío".to_string());
        }
        
        Ok(cleaned)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Pandoc falló: {}", stderr))
    }
}

fn clean_text(text: &str) -> String {
    text
        .lines()
        .map(|line| line.trim())
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
        .chars()
        .filter(|&c| c.is_alphanumeric() || c.is_whitespace() || ".,;:!?()[]\"'-/@#$%&*+=<>{}|~áéíóúñÁÉÍÓÚÑüÜ¿¡".contains(c))
        .collect::<String>()
        .trim()
        .to_string()
}

fn infer_mime_from_extension(path: &Path) -> Option<String> {
    match path.extension().and_then(|s| s.to_str()).map(|s| s.to_lowercase()) {
        Some(ext) if ext == "doc" => Some("application/msword".to_string()),
        Some(ext) if ext == "docx" => Some("application/vnd.openxmlformats-officedocument.wordprocessingml.document".to_string()),
        Some(ext) if ext == "pdf" => Some("application/pdf".to_string()),
        Some(ext) if ext == "txt" => Some("text/plain".to_string()),
        Some(ext) if ext == "rtf" => Some("application/rtf".to_string()),
        _ => None,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════════════

fn get_json_value_as_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::String(s) => s.clone(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        _ => String::new(),
    }
}

fn normalize_text(text: &str) -> String {
    text.trim().split_whitespace().collect::<Vec<_>>().join(" ")
}

fn normalize_document(doc: &str) -> String {
    doc.chars()
        .filter(|c| c.is_alphanumeric())
        .collect::<String>()
        .to_uppercase()
}

fn normalize_phone(phone: &str) -> String {
    phone
        .chars()
        .filter(|c| c.is_numeric() || *c == '+' || *c == '-')
        .collect()
}

fn normalize_email(email: &str) -> String {
    email.trim().to_lowercase()
}

fn normalize_gender(gender: &str) -> String {
    let g = gender.trim().to_lowercase();
    match g.as_str() {
        "m" | "masculino" | "male" | "hombre" => "M".to_string(),
        "f" | "femenino" | "female" | "mujer" => "F".to_string(),
        "o" | "otro" | "other" => "O".to_string(),
        _ => "U".to_string(),
    }
}

fn parse_currency(value: &str) -> f64 {
    let cleaned = value
        .chars()
        .filter(|c| c.is_numeric() || *c == '.' || *c == ',')
        .collect::<String>()
        .replace(',', ".");

    cleaned.parse::<f64>().unwrap_or(0.0)
}

fn parse_legacy_date(date_str: &str) -> Option<String> {
    if date_str.is_empty() {
        return None;
    }
    Some(date_str.to_string())
}

fn normalize_legacy_key(value: &str) -> String {
    value
        .trim()
        .chars()
        .filter(|c| !c.is_whitespace())
        .collect::<String>()
        .to_uppercase()
}

fn compute_row_hash(row: &serde_json::Map<String, serde_json::Value>) -> String {
    let mut entries: Vec<String> = row
        .iter()
        .map(|(k, v)| format!("{}={}", k.to_lowercase(), value_to_string(v)))
        .collect();
    entries.sort();

    let mut hasher = Sha256::new();
    hasher.update(entries.join("|"));
    format!("{:x}", hasher.finalize())
}

fn value_to_string(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::String(s) => s.trim().to_string(),
        serde_json::Value::Array(arr) => arr
            .iter()
            .map(value_to_string)
            .collect::<Vec<_>>()
            .join(","),
        serde_json::Value::Object(obj) => {
            let mut inner: Vec<String> = obj
                .iter()
                .map(|(k, v)| format!("{}:{}", k, value_to_string(v)))
                .collect();
            inner.sort();
            format!("{{{}}}", inner.join(";"))
        }
    }
}

fn now_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

fn build_anomaly(
    severity: &str,
    entity_type: &str,
    legacy_reference: Option<&str>,
    run_id: Option<&str>,
    message: String,
    details: serde_json::Value,
) -> ImportAnomalyDto {
    ImportAnomalyDto {
        severity: severity.to_string(),
        entity_type: entity_type.to_string(),
        legacy_reference: legacy_reference.map(|s| s.to_string()),
        run_id: run_id.map(|s| s.to_string()),
        message,
        details,
    }
}
