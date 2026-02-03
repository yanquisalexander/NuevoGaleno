// Transformador: Convierte datos raw de Paradox a DTOs normalizados
// Etapa 2: Limpieza, normalización y construcción de relaciones

use crate::import_pipeline::models::*;
use crate::import_pipeline::reader;

/// Callback para reportar progreso durante la transformación
pub type ProgressCallback = Box<dyn Fn(String) + Send>;

/// Resultado de la transformación con datos procesados y logs
pub struct TransformationResult {
    pub patients: Vec<PatientDto>,
    pub issues: Vec<super::ValidationIssue>,
}

/// Transforma datos raw de Paradox a DTOs estructurados
pub fn transform_raw_data(
    raw_data: &RawParadoxData,
    progress_cb: Option<ProgressCallback>,
) -> Result<TransformationResult, String> {
    let mut issues = Vec::new();
    let mut patients = Vec::new();

    if let Some(ref cb) = progress_cb {
        cb("🔄 Iniciando transformación de datos...".to_string());
    }

    // 1. Identificar tablas por contenido
    if let Some(ref cb) = progress_cb {
        cb("🔍 Identificando tablas de pacientes, tratamientos y pagos...".to_string());
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
                .unwrap_or("ninguna")
        ),
    ));

    let total_rows = patients_table.rows.len();
    if let Some(ref cb) = progress_cb {
        cb(format!("👥 Transformando {} pacientes...", total_rows));
    }

    // 2. Procesar pacientes (no limitar aquí: el límite ya se aplicó en reader si corresponde)
    for (idx, row) in patients_table.rows.iter().enumerate() {
        if let Some(ref cb) = progress_cb {
            if idx % 10 == 0 || idx == total_rows - 1 {
                cb(format!("👤 Procesando paciente {} de {}", idx + 1, total_rows));
            }
        }
        
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

                // 4. Procesar odontogramas del paciente
                if let Some(odontograms_table) = odontograms_table {
                    match find_and_transform_odontograms(&patient_dto, odontograms_table) {
                        Ok(odontograms) => {
                            patient_dto.odontograms = odontograms;
                        }
                        Err(e) => {
                            issues.push(super::ValidationIssue::warning(
                                "odontogram",
                                &patient_dto.temp_id,
                                "processing",
                                format!("Error procesando odontogramas: {}", e),
                            ));
                        }
                    }
                }

                patients.push(patient_dto);
            }
            Err(e) => {
                // Cambiar a warning en lugar de error para permitir continuar
                issues.push(super::ValidationIssue::warning(
                    "patient",
                    "unknown",
                    "parsing",
                    format!("Paciente ignorado por error de parseo: {}", e),
                ));
            }
        }
    }

    if let Some(ref cb) = progress_cb {
        cb(format!("✅ Transformación completada: {} pacientes procesados", patients.len()));
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
        let value_str = get_json_value_as_string(value);
        let value_str = value_str.trim();

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
            // Sin apellido, usar placeholder
            patient.last_name = "Paciente".to_string();
        }
    }

    // Si ambos están vacíos, usar identificadores disponibles como nombre
    if patient.first_name.is_empty() && patient.last_name.is_empty() {
        if let Some(ref doc) = patient.document_number {
            patient.first_name = "Paciente".to_string();
            patient.last_name = doc.clone();
        } else if let Some(ref legacy_id) = patient.legacy_id {
            patient.first_name = "Paciente".to_string();
            patient.last_name = format!("#{}", legacy_id);
        } else {
            // Último recurso: usar ID temporal
            patient.first_name = "Paciente".to_string();
            patient.last_name = "Sin datos".to_string();
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
        let value_str = get_json_value_as_string(value);
        let value_str = value_str.trim();

        match key_lower.as_str() {
            k if k == "id" || k.contains("id_trat") => {
                treatment.legacy_id = Some(value_str.to_string());
            }
            k if k.contains("nombre") || k.contains("tratamiento") || k.contains("treatment") || k.contains("concepto") => {
                treatment.name = normalize_text(value_str);
            }
            k if k.contains("descripcion") || k.contains("description") => {
                treatment.description = Some(value_str.to_string());
            }
            k if k.contains("pieza") || k.contains("tooth") || k.contains("diente") || k.contains("nodiente") => {
                treatment.tooth_number = Some(value_str.to_string());
            }
            k if k.contains("estado") || k.contains("status") || k.contains("avance") => {
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
        // Buscar relación con el tratamiento usando múltiples estrategias
        let belongs_to_treatment = row.iter().any(|(key, value)| {
            let key_lower = key.to_lowercase();
            let value_str = value.as_str().unwrap_or("");
            
            // Estrategia 1: Por clave de tratamiento
            if (key_lower.contains("clavetratam") || key_lower.contains("tratam") || key_lower.contains("treatment")) 
                && !key_lower.contains("clavepac") {
                if let Some(ref legacy_id) = treatment.legacy_id {
                    return value_str == legacy_id;
                }
            }
            
            // Estrategia 2: Por consecutivo (algunas DB usan esto)
            if key_lower.contains("consecutivo") && treatment.legacy_id.is_some() {
                if let Some(ref legacy_id) = treatment.legacy_id {
                    return value_str == legacy_id;
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

fn find_and_transform_odontograms(
    patient: &PatientDto,
    odontograms_table: &RawTable,
) -> Result<Vec<OdontogramDto>, String> {
    let mut odontograms = Vec::new();

    for row in &odontograms_table.rows {
        // Buscar relación con el paciente
        let belongs_to_patient = row.iter().any(|(key, value)| {
            let key_lower = key.to_lowercase();
            if key_lower.contains("clavepac") || key_lower.contains("clavpac") || key_lower.contains("paciente") {
                if let Some(ref doc) = patient.document_number {
                    return value.as_str().unwrap_or("") == doc;
                }
                if let Some(ref legacy_id) = patient.legacy_id {
                    return value.as_str().unwrap_or("") == legacy_id;
                }
            }
            false
        });

        if !belongs_to_patient {
            continue;
        }

        match transform_odontogram_row(row, patient) {
            Ok(odontogram) => odontograms.push(odontogram),
            Err(_) => {
                // Continuar con el siguiente
            }
        }
    }

    Ok(odontograms)
}

fn transform_odontogram_row(
    row: &serde_json::Map<String, serde_json::Value>,
    patient: &PatientDto,
) -> Result<OdontogramDto, String> {
    let mut odontogram = OdontogramDto::new_with_temp_id(patient.temp_id.clone());

    odontogram.raw_data = serde_json::Value::Object(row.clone());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let value_str = get_json_value_as_string(value);
        let value_str = value_str.trim();

        match key_lower.as_str() {
            k if k.contains("nodiente") || k.contains("diente") || k.contains("tooth") => {
                odontogram.tooth_number = value_str.to_string();
            }
            k if k.contains("tipo") || k.contains("condition") || k.contains("notrata") => {
                odontogram.condition = value_str.to_string();
            }
            k if k.contains("color") || k.contains("colour") => {
                odontogram.color = Some(value_str.to_string());
            }
            k if k.contains("concepto") || k.contains("notes") || k.contains("observ") => {
                odontogram.notes = Some(value_str.to_string());
            }
            k if k.contains("fecha") || k.contains("date") => {
                odontogram.date = parse_legacy_date(value_str);
            }
            _ => {}
        }
    }

    Ok(odontogram)
}

fn transform_payment_row(
    row: &serde_json::Map<String, serde_json::Value>,
    treatment: &TreatmentDto,
) -> Result<PaymentDto, String> {
    let mut payment = PaymentDto::new_with_temp_id(treatment.temp_id.clone());

    payment.raw_data = serde_json::Value::Object(row.clone());

    for (key, value) in row.iter() {
        let key_lower = key.to_lowercase();
        let value_str = get_json_value_as_string(value);
        let value_str = value_str.trim();

        match key_lower.as_str() {
            k if k == "id" => {
                payment.legacy_id = Some(value_str.to_string());
            }
            k if k.contains("monto") || k.contains("amount") || k.contains("importe") || k.contains("pago") => {
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

/// Extrae el valor de un campo JSON como string, manejando tanto strings como números
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
