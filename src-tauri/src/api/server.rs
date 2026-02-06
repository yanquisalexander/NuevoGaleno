// HTTP API Server
// Manages the lifecycle of the HTTP API server

use crate::node::HostConfig;
use axum::{middleware, Router};
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::{Any, CorsLayer};

/// API server state
pub struct ApiServer {
    handle: Option<tokio::task::JoinHandle<()>>,
}

impl ApiServer {
    pub fn new() -> Self {
        Self { handle: None }
    }

    /// Start the API server
    pub async fn start(&mut self, config: HostConfig) -> Result<(), String> {
        if self.handle.is_some() {
            return Err("API server is already running".to_string());
        }

        let port = config.api_port;
        let token = config.api_token.clone();
        let enable_cors = config.enable_cors;

        // Create router with authentication middleware
        let mut app = Router::new()
            .nest("/api", super::routes::patient_routes())
            .layer(middleware::from_fn_with_state(
                token.clone(),
                super::auth_middleware,
            ));

        // Add CORS if enabled
        if enable_cors {
            let cors = CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any);
            app = app.layer(cors);
        }

        let addr = format!("0.0.0.0:{}", port);
        
        // Try to bind immediately to catch early errors
        let listener = tokio::net::TcpListener::bind(&addr)
            .await
            .map_err(|e| format!("Failed to bind to {}: {}", addr, e))?;

        log::info!("HTTP API server bound to {}", addr);

        // Spawn server in background
        let handle = tokio::spawn(async move {
            log::info!("Starting HTTP API server on {}", addr);

            if let Err(e) = axum::serve(listener, app).await {
                log::error!("API server error: {}", e);
            }
        });

        self.handle = Some(handle);
        log::info!("HTTP API server started on port {}", port);

        Ok(())
    }

    /// Stop the API server
    pub async fn stop(&mut self) -> Result<(), String> {
        if let Some(handle) = self.handle.take() {
            handle.abort();
            log::info!("HTTP API server stopped");
            Ok(())
        } else {
            Err("API server is not running".to_string())
        }
    }

    /// Check if server is running
    pub fn is_running(&self) -> bool {
        self.handle.is_some()
    }
}

impl Drop for ApiServer {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            handle.abort();
        }
    }
}

/// Global API server instance
static API_SERVER: once_cell::sync::Lazy<Arc<RwLock<ApiServer>>> =
    once_cell::sync::Lazy::new(|| Arc::new(RwLock::new(ApiServer::new())));

/// Start the global API server
pub async fn start_api_server(config: HostConfig) -> Result<(), String> {
    let mut server = API_SERVER.write().await;
    server.start(config).await
}

/// Stop the global API server
pub async fn stop_api_server() -> Result<(), String> {
    let mut server = API_SERVER.write().await;
    server.stop().await
}

/// Check if API server is running
pub async fn is_api_server_running() -> bool {
    let server = API_SERVER.read().await;
    server.is_running()
}
