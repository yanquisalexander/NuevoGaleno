// Validador: Verifica consistencia, integridad y calidad de datos
// Etapa 3: Detección de anomalías y problemas antes de persistir

use crate::import_pipeline::models::*;
use crate::import_pipeline::{IssueSeverity, ValidationIssue};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub issues: Vec<ValidationIssue>,
    pub critical_count: usize,
    pub error_count: usize,
    pub warning_count: usize,
}

impl ValidationResult {
    pub fn can_proceed(&self) -> bool {
        self.critical_count == 0 && self.error_count == 0
    }
}

/// Valida todos los datos transformados
pub fn validate_all(patients: &[PatientDto]) -> ValidationResult {
    let mut issues = Vec::new();

    // 1. Validar cada paciente
    for patient in patients {
        issues.extend(validate_patient(patient));

        // 2. Validar tratamientos del paciente
        for treatment in &patient.treatments {
            issues.extend(validate_treatment(treatment));

            // 3. Validar pagos del tratamiento
            for payment in &treatment.payments {
                issues.extend(validate_payment(payment));
            }

            // 4. Validar consistencia de pagos vs tratamiento
            issues.extend(validate_treatment_payments_consistency(treatment));
        }
    }

    // 5. Validaciones globales
    issues.extend(validate_duplicates(patients));

    // Contar por severidad
    let critical_count = issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Critical)
        .count();
    let error_count = issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Error)
        .count();
    let warning_count = issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Warning)
        .count();

    ValidationResult {
        is_valid: critical_count == 0 && error_count == 0,
        issues,
        critical_count,
        error_count,
        warning_count,
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDADORES INDIVIDUALES
// ═══════════════════════════════════════════════════════════════════════════

fn validate_patient(patient: &PatientDto) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    // Identificador del registro para el usuario
    let patient_info = if !patient.first_name.is_empty() || !patient.last_name.is_empty() {
        format!("{} {}", patient.first_name.trim(), patient.last_name.trim())
    } else if let Some(ref doc) = patient.document_number {
        format!("Doc: {}", doc)
    } else if let Some(ref legacy_id) = patient.legacy_patient_id {
        format!("ID legacy: {}", legacy_id)
    } else {
        "Paciente desconocido".to_string()
    };

    // Campos obligatorios - En datos legacy, convertir a warnings si falta información
    if patient.first_name.trim().is_empty() {
        issues.push(ValidationIssue::warning(
            "patient",
            &patient.temp_id,
            "first_name",
            format!("[{}] El nombre es obligatorio (paciente se importará con datos incompletos)", patient_info),
        ));
    }

    if patient.last_name.trim().is_empty() {
        issues.push(ValidationIssue::warning(
            "patient",
            &patient.temp_id,
            "last_name",
            format!("[{}] El apellido es obligatorio (paciente se importará con datos incompletos)", patient_info),
        ));
    }

    // Validación de documento
    if let Some(ref doc) = patient.document_number {
        if doc.trim().is_empty() {
            issues.push(ValidationIssue::warning(
                "patient",
                &patient.temp_id,
                "document_number",
                "Documento vacío".to_string(),
            ));
        } else if doc.len() < 6 {
            issues.push(ValidationIssue::warning(
                "patient",
                &patient.temp_id,
                "document_number",
                format!("Documento sospechosamente corto: '{}'", doc),
            ));
        }
    } else {
        issues.push(ValidationIssue::warning(
            "patient",
            &patient.temp_id,
            "document_number",
            format!("Paciente sin documento: {}", patient.full_name()),
        ));
    }

    // Validación de email
    if let Some(ref email) = patient.email {
        if !email.contains('@') || !email.contains('.') {
            issues.push(ValidationIssue::warning(
                "patient",
                &patient.temp_id,
                "email",
                format!("Email con formato inválido: '{}'", email),
            ));
        }
    }

    // Validación de teléfono
    if let Some(ref phone) = patient.phone {
        if phone.is_empty() {
            issues.push(ValidationIssue::warning(
                "patient",
                &patient.temp_id,
                "phone",
                "Teléfono vacío".to_string(),
            ));
        }
    } else {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Info,
            entity_type: "patient".to_string(),
            entity_id: Some(patient.temp_id.clone()),
            field: "phone".to_string(),
            message: format!("Paciente sin teléfono: {}", patient.full_name()),
            raw_value: None,
            suggested_fix: None,
        });
    }

    // Validación de fecha de nacimiento
    if patient.birth_date.is_none() {
        issues.push(ValidationIssue {
            severity: IssueSeverity::Info,
            entity_type: "patient".to_string(),
            entity_id: Some(patient.temp_id.clone()),
            field: "birth_date".to_string(),
            message: "Fecha de nacimiento no disponible".to_string(),
            raw_value: None,
            suggested_fix: None,
        });
    }

    if !patient.orphan_payments.is_empty() {
        issues.push(ValidationIssue::warning(
            "patient",
            &patient.temp_id,
            "orphan_payments",
            format!(
                "Paciente con {} pagos sin tratamiento asociado",
                patient.orphan_payments.len()
            ),
        ));
    }

    issues
}

fn validate_treatment(treatment: &TreatmentDto) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    // Nombre obligatorio
    if treatment.name.trim().is_empty() {
        issues.push(ValidationIssue::error(
            "treatment",
            &treatment.temp_id,
            "name",
            "El nombre del tratamiento es obligatorio".to_string(),
        ));
    }

    if treatment.legacy_treatment_id.is_none() {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "legacy_treatment_id",
            "Tratamiento sin clave legacy; revisar trazabilidad".to_string(),
        ));
    }

    // Costo debe ser >= 0
    if treatment.total_cost < 0.0 {
        issues.push(ValidationIssue::error(
            "treatment",
            &treatment.temp_id,
            "total_cost",
            format!("Costo negativo: {}", treatment.total_cost),
        ));
    }

    // Monto pagado no puede ser negativo
    if treatment.paid_amount < 0.0 {
        issues.push(ValidationIssue::error(
            "treatment",
            &treatment.temp_id,
            "paid_amount",
            format!("Monto pagado negativo: {}", treatment.paid_amount),
        ));
    }

    // Monto pagado no puede exceder el total
    if treatment.paid_amount > treatment.total_cost {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "paid_amount",
            format!(
                "Monto pagado ({}) excede el costo total ({})",
                treatment.paid_amount, treatment.total_cost
            ),
        ));
    }

    // Balance debe coincidir
    let expected_balance = treatment.total_cost - treatment.paid_amount;
    if (treatment.balance - expected_balance).abs() > 0.01 {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "balance",
            format!(
                "Balance inconsistente. Registrado: {}, Calculado: {}",
                treatment.balance, expected_balance
            ),
        ));
    }

    // Estado desconocido
    if treatment.status == TreatmentStatus::Unknown {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "status",
            "Estado de tratamiento desconocido o no reconocido".to_string(),
        ));
    }

    // Tratamiento completado con saldo pendiente
    if treatment.status == TreatmentStatus::Completed && treatment.balance > 0.01 {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "status",
            format!(
                "Tratamiento marcado como completado pero tiene saldo pendiente: ${}",
                treatment.balance
            ),
        ));
    }

    issues
}

fn validate_payment(payment: &PaymentDto) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    // Monto obligatorio y positivo
    if payment.amount <= 0.0 {
        issues.push(ValidationIssue::error(
            "payment",
            &payment.temp_id,
            "amount",
            format!("Monto de pago inválido: {}", payment.amount),
        ));
    }

    if payment.legacy_treatment_id.is_none() {
        issues.push(ValidationIssue::warning(
            "payment",
            &payment.temp_id,
            "legacy_treatment_id",
            "Pago sin referencia legacy de tratamiento".to_string(),
        ));
    }

    // Fecha recomendada
    if payment.payment_date.is_none() {
        issues.push(ValidationIssue::warning(
            "payment",
            &payment.temp_id,
            "payment_date",
            "Pago sin fecha registrada".to_string(),
        ));
    }

    issues
}

fn validate_treatment_payments_consistency(treatment: &TreatmentDto) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();

    if treatment.payments.is_empty() && treatment.paid_amount > 0.0 {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "payments",
            format!(
                "Tratamiento indica monto pagado (${}) pero no tiene pagos registrados",
                treatment.paid_amount
            ),
        ));
        return issues;
    }

    // Sumar todos los pagos
    let payments_sum: f64 = treatment.payments.iter().map(|p| p.amount).sum();

    // Verificar consistencia (tolerancia de 1 centavo)
    if (payments_sum - treatment.paid_amount).abs() > 0.01 {
        issues.push(ValidationIssue::warning(
            "treatment",
            &treatment.temp_id,
            "payments",
            format!(
                "Suma de pagos (${:.2}) no coincide con monto pagado registrado (${:.2}). Diferencia: ${:.2}",
                payments_sum,
                treatment.paid_amount,
                (payments_sum - treatment.paid_amount).abs()
            ),
        ));
    }

    issues
}

fn validate_duplicates(patients: &[PatientDto]) -> Vec<ValidationIssue> {
    let mut issues = Vec::new();
    let mut seen_docs = std::collections::HashMap::new();

    for patient in patients {
        // Verificar duplicados por documento
        if let Some(ref doc) = patient.document_number {
            if !doc.is_empty() {
                if let Some(other_id) = seen_docs.get(doc) {
                    issues.push(ValidationIssue::warning(
                        "patient",
                        &patient.temp_id,
                        "document_number",
                        format!(
                            "Documento duplicado '{}' entre {} y otro paciente ({})",
                            doc,
                            patient.full_name(),
                            other_id
                        ),
                    ));
                } else {
                    seen_docs.insert(doc.clone(), patient.temp_id.clone());
                }
            }
        }
    }

    issues
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES PARA REPORTES
// ═══════════════════════════════════════════════════════════════════════════

pub fn generate_validation_summary(result: &ValidationResult) -> String {
    format!(
        "Validación: {} | Críticos: {} | Errores: {} | Advertencias: {}",
        if result.is_valid {
            "✓ APROBADA"
        } else {
            "✗ RECHAZADA"
        },
        result.critical_count,
        result.error_count,
        result.warning_count
    )
}
