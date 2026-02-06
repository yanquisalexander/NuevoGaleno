// Node Configuration Module
// Manages the multi-node architecture configuration

pub mod config;

use serde::{Deserialize, Serialize};

/// Node operation mode
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NodeMode {
    /// Standalone mode - local database only
    Standalone,
    /// Host mode - local database + HTTP API server
    Host,
    /// Client mode - connect to remote host via HTTP
    Client,
}

impl Default for NodeMode {
    fn default() -> Self {
        NodeMode::Standalone
    }
}

impl std::fmt::Display for NodeMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NodeMode::Standalone => write!(f, "standalone"),
            NodeMode::Host => write!(f, "host"),
            NodeMode::Client => write!(f, "client"),
        }
    }
}

/// Node configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    /// Current node mode
    pub mode: NodeMode,
    /// Node name/identifier
    pub node_name: String,
    /// Host configuration (only used in Host mode)
    pub host_config: Option<HostConfig>,
    /// Client configuration (only used in Client mode)
    pub client_config: Option<ClientConfig>,
}

/// Configuration for Host mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HostConfig {
    /// Port for HTTP API server
    pub api_port: u16,
    /// API authentication token
    pub api_token: String,
    /// Enable CORS
    pub enable_cors: bool,
}

impl Default for HostConfig {
    fn default() -> Self {
        Self {
            api_port: 3000,
            api_token: String::new(),
            enable_cors: true,
        }
    }
}

/// Configuration for Client mode
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClientConfig {
    /// Remote host URL (e.g., "http://192.168.1.100:3000")
    pub remote_url: String,
    /// Authentication token for remote host
    pub auth_token: String,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            remote_url: String::new(),
            auth_token: String::new(),
        }
    }
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            mode: NodeMode::Standalone,
            node_name: hostname::get()
                .ok()
                .and_then(|h| h.into_string().ok())
                .unwrap_or_else(|| "NuevoGaleno".to_string()),
            host_config: None,
            client_config: None,
        }
    }
}
