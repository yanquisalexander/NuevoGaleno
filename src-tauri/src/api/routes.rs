// HTTP API Routes
// Defines API endpoints that mirror Tauri commands

use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tokio::task;

use crate::db::patients::{CreatePatientInput, UpdatePatientInput};
use crate::services::auth::{AuthService, LoginRequest};
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

// ===== AUTH ROUTES =====

/// POST /api/auth/login - Authenticate and get JWT token
pub async fn login(Json(req): Json<LoginRequest>) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = AuthService::new();
        match service.login(req.username, req.password) {
            Ok(response) => (StatusCode::OK, Json(response)).into_response(),
            Err(e) => (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "error": "Authentication failed",
                    "message": e
                })),
            )
                .into_response(),
        }
    })
    .await
    .unwrap()
}

/// Response for token verification
#[derive(Serialize)]
pub struct VerifyResponse {
    pub valid: bool,
    pub user: Option<crate::db::users::User>,
}

/// Helper function for unauthorized response
fn unauthorized_response() -> axum::http::Response<axum::body::Body> {
    (
        StatusCode::UNAUTHORIZED,
        Json(VerifyResponse {
            valid: false,
            user: None,
        }),
    )
        .into_response()
}

/// GET /api/auth/verify - Verify JWT token (requires Authorization header)
pub async fn verify_token(
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    // Extract token from Authorization header
    let token = match headers.get("Authorization") {
        Some(value) => match value.to_str() {
            Ok(header) => {
                if header.starts_with("Bearer ") {
                    header[7..].to_string()
                } else {
                    return unauthorized_response();
                }
            }
            Err(_) => {
                return unauthorized_response();
            }
        },
        None => {
            return unauthorized_response();
        }
    };

    task::spawn_blocking(move || -> axum::http::Response<axum::body::Body> {
        let service = AuthService::new();
        match service.verify_token(&token) {
            Ok(user) => (
                StatusCode::OK,
                Json(VerifyResponse {
                    valid: true,
                    user: Some(user),
                }),
            )
                .into_response(),
            Err(_) => unauthorized_response(),
        }
    })
    .await
    .unwrap()
}

// ===== PATIENT ROUTES =====

/// GET /api/patients - Get all patients with optional pagination
pub async fn get_patients(Query(params): Query<PaginationQuery>) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.get_all(params.limit, params.offset) {
            Ok(patients) => (StatusCode::OK, Json(patients)).into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// GET /api/patients/:id - Get patient by ID
pub async fn get_patient_by_id(Path(id): Path<i64>) -> impl IntoResponse {
    task::spawn_blocking(move || {
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
    })
    .await
    .unwrap()
}

/// POST /api/patients - Create a new patient
pub async fn create_patient(Json(input): Json<CreatePatientInput>) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.create(input) {
            Ok(id) => (
                StatusCode::CREATED,
                Json(serde_json::json!({ "id": id })),
            )
                .into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// PUT /api/patients/:id - Update patient
pub async fn update_patient(
    Path(id): Path<i64>,
    Json(input): Json<UpdatePatientInput>,
) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.update(id, input) {
            Ok(_) => (
                StatusCode::OK,
                Json(serde_json::json!({ "message": "Patient updated successfully" })),
            )
                .into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// DELETE /api/patients/:id - Delete patient
pub async fn delete_patient(Path(id): Path<i64>) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.delete(id) {
            Ok(_) => (
                StatusCode::OK,
                Json(serde_json::json!({ "message": "Patient deleted successfully" })),
            )
                .into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// GET /api/patients/search?q=<query> - Search patients
pub async fn search_patients(Query(params): Query<SearchQuery>) -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.search(&params.q) {
            Ok(patients) => (StatusCode::OK, Json(patients)).into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// GET /api/patients/count - Get total patient count
pub async fn get_patients_count() -> impl IntoResponse {
    task::spawn_blocking(move || {
        let service = PatientService::new();
        match service.get_count() {
            Ok(count) => (
                StatusCode::OK,
                Json(serde_json::json!({ "count": count })),
            )
                .into_response(),
            Err(e) => super::service_error_to_response(e),
        }
    })
    .await
    .unwrap()
}

/// Create patient routes
pub fn patient_routes() -> Router {
    Router::new()
        .route("/health", axum::routing::get(health_check))
        // Auth routes (no authentication required for login)
        .route("/auth/login", axum::routing::post(login))
        .route("/auth/verify", axum::routing::get(verify_token))
        // Patient routes (authentication required via middleware)
        .route("/patients", axum::routing::get(get_patients))
        .route("/patients", axum::routing::post(create_patient))
        .route("/patients/search", axum::routing::get(search_patients))
        .route("/patients/count", axum::routing::get(get_patients_count))
        .route("/patients/:id", axum::routing::get(get_patient_by_id))
        .route("/patients/:id", axum::routing::put(update_patient))
        .route("/patients/:id", axum::routing::delete(delete_patient))
}