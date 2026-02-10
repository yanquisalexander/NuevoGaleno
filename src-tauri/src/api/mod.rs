// HTTP API Module
// Provides an optional HTTP API that calls the same domain services as Tauri commands
// This allows remote clients to connect to a host instance

pub mod routes;
pub mod server;

use axum::{
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

use crate::services::auth::AuthService;

/// API authentication middleware
/// Supports both:
/// 1. Static Bearer token (for host-to-host communication)
/// 2. JWT tokens (for user authentication)
pub async fn auth_middleware(
    State(expected_token): State<String>,
    mut req: Request,
    next: Next,
) -> Result<Response, Response> {
    // Skip auth for auth endpoints
    let path = req.uri().path();
    if path == "/api/auth/login" || path == "/api/health" {
        return Ok(next.run(req).await);
    }

    let auth_header = req
        .headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok());

    if let Some(token) = auth_header {
        if token.starts_with("Bearer ") {
            let provided_token = &token[7..];
            
            // First, check if it's the static API token
            if provided_token == expected_token {
                return Ok(next.run(req).await);
            }
            
            // If not, try to verify it as a JWT token
            let auth_service = AuthService::new();
            if let Ok(user) = auth_service.verify_token(provided_token) {
                // Store user info in request extensions for potential use
                req.extensions_mut().insert(user);
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
