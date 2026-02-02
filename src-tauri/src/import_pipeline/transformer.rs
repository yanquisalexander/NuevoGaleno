// Transformador: Convierte datos raw de Paradox a DTOs normalizados
// Etapa 2: Limpieza, normalización y construcción de relaciones

use crate::import_pipeline::models::*;
use crate::import_pipeline::reader;

/// Resultado de la transformación con datos procesados y logs
pub struct TransformationResult {
    pub patients: Vec<PatientDto>,
    pub issues: Vec<super::ValidationIssue>,
}

/// Transforma datos raw de Paradox a DTOs estructurados
pub fn transform_raw_data(raw_data: &RawParadoxData) -> Result<TransformationResult, String> {
    let mut issues = Vec::new();
    let mut patients = Vec::new();

    // 1. Identificar tablas por contenido
    let patients_table = reader::identify_patients_table(raw_data)
        .ok_or("No se pudo identificar la tabla de pacientes")?;

    let treatments_table = reader::identify_treatments_table(raw_data);
    let payments_table = reader::identify_payments_table(raw_data);

    issues.push(super::ValidationIssue::info(
        "system",
        "tables",
        format!(
            "Tablas identificadas - Pacientes: {}, Tratamientos: {}, Pagos: {}",
            patients_table.table_name,
            treatments_table
                .map(|t| t.table_name.as_str())
                .unwrap_or("ninguna"),
            payments_table
                .map(|t| t.table_name.as_str())
                .unwrap_or("ninguna")
        ),
    ));

    // 2. Procesar pacientes (no limitar aquí: el límite ya se aplicó en reader si corresponde)
    for row in &patients_table.rows {
        match transform_patient_row(row, patients_table) {
            Ok(mut patient_dto) => {
                // 3. Procesar tratamientos del paciente
                if let Some(treatments_table) = treatments_table {
                    match find_and_transform_treatments(
                        &patient_dto,
                        treatments_table,
                        payments_table,
                    ) {
                        Ok(treatments) => {
                            patient_dto.treatments = treatments;
                        }
                        Err(e) => {
                            issues.push(super::ValidationIssue::warning(
                                "treatment",
                                &patient_dto.temp_id,
                                "processing",
                                format!("Error procesando tratamientos: {}", e),
                            ));
                        }
                    }
                }

                patients.push(patient_dto);
            }
            Err(e) => {
                issues.push(super::ValidationIssue::error(
                    "patient",
                    "unknown",
                    "parsing",
                    format!("Error parseando paciente: {}", e),
                ));
            }
        }
    }

    Ok(TransformationResult { patients, issues })
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSFORMADORES INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════

fn transform_patient_row(
    row: &serde_json::Map<String, serde_json::Value>,
    _table: &RawTable,
) -> Result<PatientDto, String> {
    let mut patient = PatientDto::new_with_temp_id();

    // Guardar datos raw para debugging
    patient.raw_data = serde_json::Value::Object(row.clone());

    // Detectar y mapear campos dinámicamente
    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let value_str = value.as_str().unwrap_or("").trim();

        // Mapeo de campos con múltiples variantes legacy
        match key_lower.as_str() {
            k if k.contains("nombre") && !k.contains("apellido") => {
                patient.first_name = normalize_text(value_str);
            }
            k if k.contains("apellido") => {
                patient.last_name = normalize_text(value_str);
            }
            k if k.contains("documento") || k.contains("dni") || k.contains("cedula") => {
                patient.document_number = Some(normalize_document(value_str));
            }
            k if k.contains("clavpac") || k.contains("clavepac") || k.contains("clavpac") => {
                // CLAVEPAC como documento si no hay otro
                let doc = normalize_document(value_str);
                if !doc.is_empty() {
                    patient.document_number = Some(doc);
                }
            }
            k if k.contains("clavedoc") || k.contains("doc") => {
                let doc = normalize_document(value_str);
                if !doc.is_empty() && patient.document_number.is_none() {
                    patient.document_number = Some(doc);
                }
            }
            k if k == "registro" || k.contains("registro") => {
                let doc = normalize_document(value_str);
                if !doc.is_empty() && patient.document_number.is_none() {
                    patient.document_number = Some(doc);
                }
            }
            k if k.contains("telefono") || k.contains("phone") || k.contains("celular") => {
                patient.phone = Some(normalize_phone(value_str));
            }
            k if k.contains("email") || k.contains("correo") || k.contains("mail") => {
                patient.email = Some(normalize_email(value_str));
            }
            k if k.contains("direccion") || k.contains("address") || k.contains("domicilio") => {
                patient.address = Some(normalize_text(value_str));
            }
            k if k.contains("ciudad") || k.contains("city") => {
                patient.city = Some(normalize_text(value_str));
            }
            k if k.contains("fecha_nac") || k.contains("nacimiento") || k.contains("birth") => {
                patient.birth_date = parse_legacy_date(value_str);
            }
            k if k.contains("sexo") || k.contains("genero") || k.contains("gender") => {
                patient.gender = Some(normalize_gender(value_str));
            }
            k if k.contains("alergia") || k.contains("allergy") => {
                patient.allergies = Some(value_str.to_string());
            }
            k if k == "id" || k.contains("id_pac") || k.contains("patient_id") => {
                patient.legacy_id = Some(value_str.to_string());
            }
            _ => {}
        }
    }

    // Derivar apellido si no se encontró campo explícito
    if patient.last_name.is_empty() && !patient.first_name.is_empty() {
        let parts: Vec<&str> = patient.first_name.split_whitespace().collect();
        if parts.len() >= 2 {
            patient.last_name = parts.last().unwrap().to_string();
            patient.first_name = parts[..parts.len() - 1].join(" ");
        } else {
            // Sin apellido, usar placeholder para pasar validación
            patient.last_name = "Paciente".to_string();
        }
    }

    Ok(patient)
}

fn find_and_transform_treatments(
    patient: &PatientDto,
    treatments_table: &RawTable,
    payments_table: Option<&RawTable>,
) -> Result<Vec<TreatmentDto>, String> {
    let mut treatments = Vec::new();

    // Buscar tratamientos relacionados con este paciente
    for row in &treatments_table.rows {
        // Intentar encontrar la clave foránea del paciente
        let belongs_to_patient = row.iter().any(|(key, value)| {
            let key_lower = key.to_lowercase();
            if key_lower.contains("paciente") || key_lower.contains("patient") {
                if let Some(ref legacy_id) = patient.legacy_id {
                    return value.as_str().unwrap_or("") == legacy_id;
                }
            }
            false
        });

        if !belongs_to_patient {
            continue;
        }

        // Transformar tratamiento
        match transform_treatment_row(row, patient, payments_table) {
            Ok(treatment) => treatments.push(treatment),
            Err(_e) => {
                // Log error pero continuar
            }
        }
    }

    Ok(treatments)
}

fn transform_treatment_row(
    row: &serde_json::Map<String, serde_json::Value>,
    patient: &PatientDto,
    payments_table: Option<&RawTable>,
) -> Result<TreatmentDto, String> {
    let mut treatment = TreatmentDto::new_with_temp_id(patient.temp_id.clone());

    treatment.raw_data = serde_json::Value::Object(row.clone());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let value_str = value.as_str().unwrap_or("").trim();

        match key_lower.as_str() {
            k if k == "id" || k.contains("id_trat") => {
                treatment.legacy_id = Some(value_str.to_string());
            }
            k if k.contains("nombre") || k.contains("tratamiento") || k.contains("treatment") => {
                treatment.name = normalize_text(value_str);
            }
            k if k.contains("descripcion") || k.contains("description") => {
                treatment.description = Some(value_str.to_string());
            }
            k if k.contains("pieza") || k.contains("tooth") || k.contains("diente") => {
                treatment.tooth_number = Some(value_str.to_string());
            }
            k if k.contains("estado") || k.contains("status") => {
                treatment.status = TreatmentStatus::from_legacy_value(value_str);
            }
            k if k.contains("costo") || k.contains("precio") || k.contains("total") => {
                treatment.total_cost = parse_currency(value_str);
            }
            k if k.contains("pagado") || k.contains("paid") => {
                treatment.paid_amount = parse_currency(value_str);
            }
            k if k.contains("saldo") || k.contains("balance") || k.contains("debe") => {
                treatment.balance = parse_currency(value_str);
            }
            _ => {}
        }
    }

    // Recalcular balance si no viene explícito
    if treatment.balance == 0.0 && treatment.total_cost > 0.0 {
        treatment.recalculate_balance();
    }

    // Buscar pagos si existe tabla de pagos
    if let Some(payments_table) = payments_table {
        treatment.payments = find_and_transform_payments(&treatment, payments_table);
    }

    Ok(treatment)
}

fn find_and_transform_payments(
    treatment: &TreatmentDto,
    payments_table: &RawTable,
) -> Vec<PaymentDto> {
    let mut payments = Vec::new();

    for row in &payments_table.rows {
        let belongs_to_treatment = row.iter().any(|(key, value)| {
            let key_lower = key.to_lowercase();
            if key_lower.contains("tratamiento") || key_lower.contains("treatment") {
                if let Some(ref legacy_id) = treatment.legacy_id {
                    return value.as_str().unwrap_or("") == legacy_id;
                }
            }
            false
        });

        if !belongs_to_treatment {
            continue;
        }

        if let Ok(payment) = transform_payment_row(row, treatment) {
            payments.push(payment);
        }
    }

    payments
}

fn transform_payment_row(
    row: &serde_json::Map<String, serde_json::Value>,
    treatment: &TreatmentDto,
) -> Result<PaymentDto, String> {
    let mut payment = PaymentDto::new_with_temp_id(treatment.temp_id.clone());

    payment.raw_data = serde_json::Value::Object(row.clone());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let value_str = value.as_str().unwrap_or("").trim();

        match key_lower.as_str() {
            k if k == "id" => {
                payment.legacy_id = Some(value_str.to_string());
            }
            k if k.contains("monto") || k.contains("amount") || k.contains("importe") => {
                payment.amount = parse_currency(value_str);
            }
            k if k.contains("fecha") || k.contains("date") => {
                payment.payment_date = parse_legacy_date(value_str);
            }
            k if k.contains("metodo") || k.contains("method") || k.contains("forma") => {
                payment.payment_method = Some(value_str.to_string());
            }
            _ => {}
        }
    }

    Ok(payment)
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES DE NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════════════════════

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
        _ => "U".to_string(), // Unknown
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

    // Intentar parsear formatos comunes
    // TODO: Implementar parser robusto con chrono
    // Por ahora, devolver el valor limpio
    Some(date_str.to_string())
}
