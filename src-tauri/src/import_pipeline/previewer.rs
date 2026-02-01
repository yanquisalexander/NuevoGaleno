// Previsualizador: Prepara datos para mostrar al usuario antes de confirmar
// Etapa 4: Generación de resumen y estadísticas

use crate::import_pipeline::models::*;
use crate::import_pipeline::validator::ValidationResult;
use serde::{Deserialize, Serialize};

/// Vista previa completa de la importación
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportPreview {
    pub summary: PreviewSummary,
    pub sample_patients: Vec<PatientPreview>,
    pub validation_report: ValidationReport,
    pub can_proceed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PreviewSummary {
    pub total_patients: usize,
    pub patients_with_data: usize,
    pub patients_empty: usize,
    
    pub total_treatments: usize,
    pub treatments_pending: usize,
    pub treatments_in_progress: usize,
    pub treatments_completed: usize,
    
    pub total_payments: usize,
    pub total_revenue: f64,
    pub total_outstanding: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatientPreview {
    pub temp_id: String,
    pub full_name: String,
    pub document: Option<String>,
    pub phone: Option<String>,
    pub treatments_count: usize,
    pub total_billed: f64,
    pub total_paid: f64,
    pub balance: f64,
    pub has_issues: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationReport {
    pub is_valid: bool,
    pub critical_issues: Vec<String>,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub total_issues: usize,
}

/// Genera una vista previa completa de los datos a importar
pub fn generate_preview(
    patients: &[PatientDto],
    validation: &ValidationResult,
) -> ImportPreview {
    let summary = calculate_summary(patients);
    let sample_patients = generate_patient_samples(patients, 50); // Primeros 50
    let validation_report = build_validation_report(validation);

    ImportPreview {
        can_proceed: validation.can_proceed(),
        summary,
        sample_patients,
        validation_report,
    }
}

fn calculate_summary(patients: &[PatientDto]) -> PreviewSummary {
    let total_patients = patients.len();
    let patients_with_data = patients
        .iter()
        .filter(|p| p.has_minimum_data())
        .count();
    let patients_empty = total_patients - patients_with_data;

    let mut total_treatments = 0;
    let mut treatments_pending = 0;
    let mut treatments_in_progress = 0;
    let mut treatments_completed = 0;
    let mut total_payments = 0;
    let mut total_revenue = 0.0;
    let mut total_outstanding = 0.0;

    for patient in patients {
        for treatment in &patient.treatments {
            total_treatments += 1;
            match treatment.status {
                TreatmentStatus::Pending => treatments_pending += 1,
                TreatmentStatus::InProgress => treatments_in_progress += 1,
                TreatmentStatus::Completed => treatments_completed += 1,
                _ => {}
            }

            total_payments += treatment.payments.len();
            total_revenue += treatment.paid_amount;
            total_outstanding += treatment.balance;
        }
    }

    PreviewSummary {
        total_patients,
        patients_with_data,
        patients_empty,
        total_treatments,
        treatments_pending,
        treatments_in_progress,
        treatments_completed,
        total_payments,
        total_revenue,
        total_outstanding,
    }
}

fn generate_patient_samples(patients: &[PatientDto], limit: usize) -> Vec<PatientPreview> {
    patients
        .iter()
        .take(limit)
        .map(|patient| {
            let treatments_count = patient.treatments.len();
            let total_billed: f64 = patient
                .treatments
                .iter()
                .map(|t| t.total_cost)
                .sum();
            let total_paid: f64 = patient
                .treatments
                .iter()
                .map(|t| t.paid_amount)
                .sum();
            let balance = total_billed - total_paid;

            PatientPreview {
                temp_id: patient.temp_id.clone(),
                full_name: patient.full_name(),
                document: patient.document_number.clone(),
                phone: patient.phone.clone(),
                treatments_count,
                total_billed,
                total_paid,
                balance,
                has_issues: false, // Se actualizará con validación
            }
        })
        .collect()
}

fn build_validation_report(validation: &ValidationResult) -> ValidationReport {
    use crate::import_pipeline::IssueSeverity;

    let critical_issues: Vec<String> = validation
        .issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Critical)
        .map(|i| format!("[{}] {}: {}", i.entity_type, i.field, i.message))
        .collect();

    let errors: Vec<String> = validation
        .issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Error)
        .map(|i| format!("[{}] {}: {}", i.entity_type, i.field, i.message))
        .collect();

    let warnings: Vec<String> = validation
        .issues
        .iter()
        .filter(|i| i.severity == IssueSeverity::Warning)
        .map(|i| format!("[{}] {}: {}", i.entity_type, i.field, i.message))
        .take(100) // Limitar warnings en reporte
        .collect();

    ValidationReport {
        is_valid: validation.is_valid,
        critical_issues,
        errors,
        warnings,
        total_issues: validation.issues.len(),
    }
}

/// Exporta la previsualización a JSON para el frontend
#[allow(dead_code)]
pub fn export_preview_to_json(preview: &ImportPreview) -> Result<String, String> {
    serde_json::to_string_pretty(preview)
        .map_err(|e| format!("Error serializando preview: {}", e))
}
