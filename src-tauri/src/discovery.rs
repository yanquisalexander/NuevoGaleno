// Node Discovery Service
// Implements mDNS-based automatic discovery of Galeno nodes on the local network

use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::broadcast;

const SERVICE_TYPE: &str = "_galeno._tcp.local.";

/// Information about a discovered Galeno node
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DiscoveredNode {
    /// Unique service name
    pub service_name: String,
    /// Human-readable node name
    pub node_name: String,
    /// Hostname or IP address
    pub hostname: String,
    /// API port
    pub port: u16,
    /// Service version
    pub version: String,
    /// Last seen timestamp (Unix timestamp)
    pub last_seen: i64,
}

/// Discovery service state
#[derive(Clone)]
pub struct DiscoveryService {
    daemon: ServiceDaemon,
    discovered_nodes: Arc<Mutex<HashMap<String, DiscoveredNode>>>,
    shutdown_tx: broadcast::Sender<()>,
}

impl DiscoveryService {
    /// Create a new discovery service
    pub fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let daemon = ServiceDaemon::new()?;
        let (shutdown_tx, _) = broadcast::channel(1);
        Ok(Self {
            daemon,
            discovered_nodes: Arc::new(Mutex::new(HashMap::new())),
            shutdown_tx,
        })
    }

    /// Start broadcasting as a host node
    pub async fn start_broadcasting(&self, node_name: &str, port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let instance_name = format!("{}.{}", node_name.replace(" ", "_"), SERVICE_TYPE.trim_end_matches('.'));
        let hostname = hostname::get()?.to_string_lossy().to_string();
        let hostname_mdns = if hostname.ends_with(".local.") {
            hostname
        } else {
            format!("{}.local.", hostname)
        };
        let version = env!("CARGO_PKG_VERSION");

        let properties = [
            ("version", version),
            ("node_name", node_name),
        ];

        let service_info = ServiceInfo::new(
            SERVICE_TYPE,
            &instance_name,
            &hostname_mdns,
            "",
            port,
            &properties[..],
        )?;

        self.daemon.register(service_info)?;

        log::info!("Started broadcasting Galeno node: {} on port {}", node_name, port);

        // Keep broadcasting until shutdown
        let mut shutdown_rx = self.shutdown_tx.subscribe();
        let _ = shutdown_rx.recv().await;

        log::info!("Stopping Galeno node broadcast");
        Ok(())
    }

    /// Start discovering other nodes on the network
    pub async fn start_discovering(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let discovered_nodes = Arc::clone(&self.discovered_nodes);
        let receiver = self.daemon.browse(SERVICE_TYPE)?;
        let mut shutdown_rx = self.shutdown_tx.subscribe();

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    event = receiver.recv_async() => {
                        match event {
                            Ok(ServiceEvent::ServiceResolved(info)) => {
                                let mut nodes = discovered_nodes.lock().unwrap();
                                let node = DiscoveredNode {
                                    service_name: info.get_fullname().to_string(),
                                    node_name: info.get_properties().get("node_name").map(|s| s.to_string()).unwrap_or_else(|| "unknown".to_string()),
                                    hostname: info.get_hostname().to_string(),
                                    port: info.get_port(),
                                    version: info.get_properties().get("version").map(|s| s.to_string()).unwrap_or_else(|| "unknown".to_string()),
                                    last_seen: chrono::Utc::now().timestamp(),
                                };
                                nodes.insert(node.service_name.clone(), node);
                            }
                            Ok(ServiceEvent::ServiceRemoved(_type, fullname)) => {
                                let mut nodes = discovered_nodes.lock().unwrap();
                                nodes.remove(&fullname);
                            }
                            _ => {}
                        }
                    }
                    _ = shutdown_rx.recv() => {
                        break;
                    }
                }
            }
        });

        log::info!("Started discovering Galeno nodes on local network");
        Ok(())
    }

    /// Get list of currently discovered nodes
    pub fn get_discovered_nodes(&self) -> Vec<DiscoveredNode> {
        let discovered = self.discovered_nodes.lock().unwrap();
        discovered.values().cloned().collect()
    }

    /// Stop the discovery service
    pub fn shutdown(&self) {
        let _ = self.shutdown_tx.send(());
    }
}

impl Default for DiscoveryService {
    fn default() -> Self {
        Self::new().unwrap()
    }
}