// HTTP API Module
// Provides an optional HTTP API that calls the same domain services as Tauri commands
// This allows remote clients to connect to a host instance

pub mod routes;
pub mod server;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

/// API authentication middleware
pub async fn auth_middleware(
    State(expected_token): State<String>,
    req: Request,
    next: Next,
) -> Result<Response, Response> {
    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    if let Some(token) = auth_header {
        if token.starts_with("Bearer ") {
            let provided_token = &token[7..];
            if provided_token == expected_token {
                return Ok(next.run(req).await);
            }
        }
    }

    Err((
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": "Unauthorized",
            "message": "Invalid or missing authentication token"
        })),
    )
        .into_response())
}

/// Convert service errors to HTTP responses
pub fn service_error_to_response(error: crate::services::ServiceError) -> Response {
    use crate::services::ServiceError;

    match error {
        ServiceError::NotFound(msg) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": "Not Found",
                "message": msg
            })),
        )
            .into_response(),
        ServiceError::ValidationError(msg) => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Validation Error",
                "message": msg
            })),
        )
            .into_response(),
        ServiceError::DatabaseError(msg) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": "Database Error",
                "message": msg
            })),
        )
            .into_response(),
        ServiceError::Unauthorized(msg) => (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "Unauthorized",
                "message": msg
            })),
        )
            .into_response(),
    }
}
