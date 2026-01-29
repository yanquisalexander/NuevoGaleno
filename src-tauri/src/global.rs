use once_cell::sync::Lazy;
use std::sync::Mutex;
use tauri::Wry;

/// Global AppHandle stored for access from background tasks.
pub static GLOBAL_APP_HANDLE: Lazy<Mutex<Option<tauri::AppHandle<Wry>>>> =
    Lazy::new(|| Mutex::new(None));
