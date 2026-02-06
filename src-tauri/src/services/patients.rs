// Patient Domain Service
// Contains all business logic for patient management
// Independent of Tauri and HTTP - pure business logic

use crate::db::patients::{
    create_patient as db_create_patient, delete_patient as db_delete_patient,
    get_patient_by_id as db_get_patient_by_id, get_patients as db_get_patients,
    get_patients_count as db_get_patients_count, search_patients as db_search_patients,
    update_patient as db_update_patient, CreatePatientInput, Patient, UpdatePatientInput,
};
use crate::services::{DomainService, ServiceError, ServiceResult};

/// Patient service handles all patient-related business logic
pub struct PatientService;

impl PatientService {
    pub fn new() -> Self {
        Self
    }

    /// Create a new patient
    pub fn create(&self, input: CreatePatientInput) -> ServiceResult<i64> {
        // Validate input
        if input.first_name.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "First name is required".to_string(),
            ));
        }
        if input.last_name.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "Last name is required".to_string(),
            ));
        }

        // Call database layer
        db_create_patient(input).map_err(|e| ServiceError::DatabaseError(e))
    }

    /// Get patient by ID
    pub fn get_by_id(&self, id: i64) -> ServiceResult<Option<Patient>> {
        db_get_patient_by_id(id).map_err(|e| ServiceError::DatabaseError(e))
    }

    /// Get all patients with optional pagination
    pub fn get_all(&self, limit: Option<i64>, offset: Option<i64>) -> ServiceResult<Vec<Patient>> {
        db_get_patients(limit, offset).map_err(|e| ServiceError::DatabaseError(e))
    }

    /// Search patients by query
    pub fn search(&self, query: &str) -> ServiceResult<Vec<Patient>> {
        if query.trim().is_empty() {
            return Err(ServiceError::ValidationError(
                "Search query cannot be empty".to_string(),
            ));
        }
        db_search_patients(query).map_err(|e| ServiceError::DatabaseError(e))
    }

    /// Update patient
    pub fn update(&self, id: i64, input: UpdatePatientInput) -> ServiceResult<()> {
        // Validate that at least one field is being updated
        if !input.has_any_field() {
            return Err(ServiceError::ValidationError(
                "At least one field must be provided for update".to_string(),
            ));
        }

        db_update_patient(id, input).map_err(|e| ServiceError::DatabaseError(e))
    }

    /// Delete patient
    pub fn delete(&self, id: i64) -> ServiceResult<()> {
        // Check if patient exists
        match self.get_by_id(id)? {
            Some(_) => db_delete_patient(id).map_err(|e| ServiceError::DatabaseError(e)),
            None => Err(ServiceError::NotFound(format!("Patient {} not found", id))),
        }
    }

    /// Get total patient count
    pub fn get_count(&self) -> ServiceResult<i64> {
        db_get_patients_count().map_err(|e| ServiceError::DatabaseError(e))
    }
}

impl DomainService for PatientService {
    fn name(&self) -> &'static str {
        "PatientService"
    }
}

impl Default for PatientService {
    fn default() -> Self {
        Self::new()
    }
}
