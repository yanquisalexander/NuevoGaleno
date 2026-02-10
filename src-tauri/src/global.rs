use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::Wry;

use crate::discovery::DiscoveryService;

/// Global AppHandle stored for access from background tasks.
pub static GLOBAL_APP_HANDLE: Lazy<Mutex<Option<tauri::AppHandle<Wry>>>> =
    Lazy::new(|| Mutex::new(None));

/// Global discovery service instance
pub static DISCOVERY_SERVICE: Lazy<Mutex<Option<DiscoveryService>>> =
    Lazy::new(|| Mutex::new(DiscoveryService::new().ok()));
