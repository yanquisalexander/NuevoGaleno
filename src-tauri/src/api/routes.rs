// HTTP API Routes
// Defines API endpoints that mirror Tauri commands

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use crate::db::patients::{CreatePatientInput, Patient, UpdatePatientInput};
use crate::services::patients::PatientService;

/// Health check endpoint
pub async fn health_check() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "service": "Nuevo Galeno API",
            "version": env!("CARGO_PKG_VERSION")
        })),
    )
}

/// Query parameters for pagination
#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Query parameters for search
#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
}

// ===== PATIENT ROUTES =====

/// GET /api/patients - Get all patients with optional pagination
pub async fn get_patients(Query(params): Query<PaginationQuery>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.get_all(params.limit, params.offset) {
        Ok(patients) => (StatusCode::OK, Json(patients)).into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// GET /api/patients/:id - Get patient by ID
pub async fn get_patient_by_id(Path(id): Path<i64>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.get_by_id(id) {
        Ok(Some(patient)) => (StatusCode::OK, Json(patient)).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Not Found",
                "message": format!("Patient {} not found", id)
            })),
        )
            .into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// POST /api/patients - Create a new patient
pub async fn create_patient(Json(input): Json<CreatePatientInput>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.create(input) {
        Ok(id) => (
            StatusCode::CREATED,
            Json(serde_json::json!({ "id": id })),
        )
            .into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// PUT /api/patients/:id - Update patient
pub async fn update_patient(
    Path(id): Path<i64>,
    Json(input): Json<UpdatePatientInput>,
) -> impl IntoResponse {
    let service = PatientService::new();
    match service.update(id, input) {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "Patient updated successfully" })),
        )
            .into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// DELETE /api/patients/:id - Delete patient
pub async fn delete_patient(Path(id): Path<i64>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.delete(id) {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({ "message": "Patient deleted successfully" })),
        )
            .into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// GET /api/patients/search?q=<query> - Search patients
pub async fn search_patients(Query(params): Query<SearchQuery>) -> impl IntoResponse {
    let service = PatientService::new();
    match service.search(&params.q) {
        Ok(patients) => (StatusCode::OK, Json(patients)).into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// GET /api/patients/count - Get total patient count
pub async fn get_patients_count() -> impl IntoResponse {
    let service = PatientService::new();
    match service.get_count() {
        Ok(count) => (
            StatusCode::OK,
            Json(serde_json::json!({ "count": count })),
        )
            .into_response(),
        Err(e) => super::service_error_to_response(e),
    }
}

/// Create patient routes
pub fn patient_routes() -> Router {
    Router::new()
        .route("/health", axum::routing::get(health_check))
        .route("/patients", axum::routing::get(get_patients))
        .route("/patients", axum::routing::post(create_patient))
        .route("/patients/search", axum::routing::get(search_patients))
        .route("/patients/count", axum::routing::get(get_patients_count))
        .route("/patients/:id", axum::routing::get(get_patient_by_id))
        .route("/patients/:id", axum::routing::put(update_patient))
        .route("/patients/:id", axum::routing::delete(delete_patient))
}
