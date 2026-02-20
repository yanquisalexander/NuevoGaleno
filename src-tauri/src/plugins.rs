use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::collections::HashMap;

/// Plugin manifest structure matching plugin.json
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub icon: String,
    pub entry: String, // Now points to index.html
    pub permissions: Vec<String>,
    pub api_version: String,
    pub hooks: Option<HashMap<String, String>>,
    pub menu_items: Option<Vec<MenuItem>>,
    pub default_size: Option<WindowSize>,
    pub allow_multiple_instances: Option<bool>,
    pub min_version: Option<String>,
    pub repository: Option<String>,
    pub homepage: Option<String>,
    pub license: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuItem {
    pub label: String,
    pub icon: String,
    pub action: String,
    pub shortcut: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowSize {
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstalledPlugin {
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: Option<String>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorePlugin {
    pub manifest: PluginManifest,
    pub downloads: u64,
    pub rating: f32,
    pub reviews: u32,
    pub verified: bool,
    pub price: Option<f32>,
    pub screenshots: Option<Vec<String>>,
    pub changelog: Option<String>,
}

pub fn get_plugins_dir() -> Result<PathBuf, String> {
    let app_data = crate::db::path::get_app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let plugins_dir = app_data.join("plugins");
    
    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }
    
    Ok(plugins_dir)
}

pub fn get_installed_plugins() -> Result<Vec<InstalledPlugin>, String> {
    let plugins_dir = get_plugins_dir()?;
    let mut plugins = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&plugins_dir) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                let manifest_path = entry.path().join("plugin.json");
                if manifest_path.exists() {
                    if let Ok(manifest_str) = fs::read_to_string(&manifest_path) {
                        if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&manifest_str) {
                            // Load plugin metadata
                            let meta_path = entry.path().join(".meta.json");
                            let (enabled, installed_at, updated_at) = if meta_path.exists() {
                                if let Ok(meta_str) = fs::read_to_string(&meta_path) {
                                    if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                                        (
                                            meta.get("enabled").and_then(|v| v.as_bool()).unwrap_or(true),
                                            meta.get("installed_at").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                            meta.get("updated_at").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                        )
                                    } else {
                                        (true, chrono::Utc::now().to_rfc3339(), None)
                                    }
                                } else {
                                    (true, chrono::Utc::now().to_rfc3339(), None)
                                }
                            } else {
                                (true, chrono::Utc::now().to_rfc3339(), None)
                            };
                            
                            plugins.push(InstalledPlugin {
                                manifest,
                                enabled,
                                installed_at,
                                updated_at,
                                path: entry.path().to_string_lossy().to_string(),
                            });
                        }
                    }
                }
            }
        }
    }
    
    Ok(plugins)
}

pub fn load_plugin_manifest(plugin_path: &str) -> Result<PluginManifest, String> {
    let manifest_path = PathBuf::from(plugin_path).join("plugin.json");
    let manifest_str = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;
    
    serde_json::from_str(&manifest_str)
        .map_err(|e| format!("Failed to parse manifest: {}", e))
}

pub fn install_plugin(plugin_path: &str, manifest: &PluginManifest) -> Result<(), String> {
    let plugins_dir = get_plugins_dir()?;
    let dest_dir = plugins_dir.join(&manifest.id);
    
    if dest_dir.exists() {
        return Err("Plugin already installed".to_string());
    }
    
    // Copy plugin files
    copy_dir_all(plugin_path, &dest_dir)
        .map_err(|e| format!("Failed to copy plugin files: {}", e))?;
    
    // Create metadata file
    let meta = serde_json::json!({
        "enabled": true,
        "installed_at": chrono::Utc::now().to_rfc3339(),
    });
    
    let meta_path = dest_dir.join(".meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
    Ok(())
}

pub fn uninstall_plugin(plugin_id: &str) -> Result<(), String> {
    let plugins_dir = get_plugins_dir()?;
    let plugin_dir = plugins_dir.join(plugin_id);
    
    if !plugin_dir.exists() {
        return Err("Plugin not found".to_string());
    }
    
    fs::remove_dir_all(&plugin_dir)
        .map_err(|e| format!("Failed to remove plugin: {}", e))?;
    
    Ok(())
}

pub fn update_plugin_status(plugin_id: &str, enabled: bool) -> Result<(), String> {
    let plugins_dir = get_plugins_dir()?;
    let meta_path = plugins_dir.join(plugin_id).join(".meta.json");
    
    if !meta_path.exists() {
        return Err("Plugin not found".to_string());
    }
    
    let mut meta: serde_json::Value = serde_json::from_str(
        &fs::read_to_string(&meta_path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?
    ).map_err(|e| format!("Failed to parse metadata: {}", e))?;
    
    meta["enabled"] = serde_json::json!(enabled);
    meta["updated_at"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
    
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
    Ok(())
}

// Plugin storage (key-value store per plugin) - Now using database
pub fn plugin_storage_get(plugin_id: &str, key: &str) -> Result<Option<serde_json::Value>, String> {
    let conn = crate::db::get_connection()?;
    
    match crate::db::plugin_data::get_plugin_data(&conn, plugin_id, key) {
        Ok(Some(entry)) => {
            // Parse the value based on type
            let value: serde_json::Value = match entry.value_type.as_str() {
                "json" => serde_json::from_str(&entry.value)
                    .map_err(|e| format!("Failed to parse JSON: {}", e))?,
                "number" => {
                    if let Ok(num) = entry.value.parse::<i64>() {
                        serde_json::json!(num)
                    } else if let Ok(num) = entry.value.parse::<f64>() {
                        serde_json::json!(num)
                    } else {
                        serde_json::json!(entry.value)
                    }
                }
                "boolean" => serde_json::json!(entry.value == "true"),
                _ => serde_json::json!(entry.value),
            };
            Ok(Some(value))
        }
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get plugin data: {}", e)),
    }
}

pub fn plugin_storage_set(plugin_id: &str, key: &str, value: serde_json::Value) -> Result<(), String> {
    let conn = crate::db::get_connection()?;
    
    // Determine value type and serialize
    let (value_str, value_type) = match &value {
        serde_json::Value::String(s) => (s.clone(), "string"),
        serde_json::Value::Number(_) => (value.to_string(), "number"),
        serde_json::Value::Bool(b) => (b.to_string(), "boolean"),
        serde_json::Value::Null => ("null".to_string(), "null"),
        _ => (serde_json::to_string(&value)
            .map_err(|e| format!("Failed to serialize value: {}", e))?, "json"),
    };
    
    crate::db::plugin_data::set_plugin_data(&conn, plugin_id, key, &value_str, value_type)
        .map_err(|e| format!("Failed to set plugin data: {}", e))
}

pub fn plugin_storage_remove(plugin_id: &str, key: &str) -> Result<(), String> {
    let conn = crate::db::get_connection()?;
    crate::db::plugin_data::remove_plugin_data(&conn, plugin_id, key)
        .map_err(|e| format!("Failed to remove plugin data: {}", e))
}

pub fn plugin_storage_clear(plugin_id: &str) -> Result<(), String> {
    let conn = crate::db::get_connection()?;
    crate::db::plugin_data::clear_plugin_data(&conn, plugin_id)
        .map_err(|e| format!("Failed to clear plugin data: {}", e))
}

// Helper function to copy directories recursively
fn copy_dir_all(src: impl AsRef<std::path::Path>, dst: impl AsRef<std::path::Path>) -> std::io::Result<()> {
    fs::create_dir_all(&dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(entry.path(), dst.as_ref().join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.as_ref().join(entry.file_name()))?;
        }
    }
    Ok(())
}

/// Installs a plugin from a .galeno file (zip archive)
pub fn install_plugin_from_zip(zip_path: &str) -> Result<String, String> {
    use std::io::Read;
    
    let file = fs::File::open(zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;
    
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;
    
    // Extract to temp directory first
    let temp_dir = std::env::temp_dir().join(format!("galeno_plugin_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    
    // Extract all files
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;
        
        let outpath = temp_dir.join(file.name());
        
        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                fs::create_dir_all(p)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to extract file: {}", e))?;
        }
    }
    
    // Read and validate manifest
    let manifest = load_plugin_manifest(&temp_dir.to_string_lossy())?;
    
    // Validate required files
    let entry_path = temp_dir.join(&manifest.entry);
    if !entry_path.exists() {
        fs::remove_dir_all(&temp_dir).ok();
        return Err(format!("Entry file '{}' not found in plugin", manifest.entry));
    }
    
    // Move to plugins directory
    let plugins_dir = get_plugins_dir()?;
    let dest_dir = plugins_dir.join(&manifest.id);
    
    if dest_dir.exists() {
        fs::remove_dir_all(&temp_dir).ok();
        return Err("Plugin already installed".to_string());
    }
    
    fs::rename(&temp_dir, &dest_dir)
        .map_err(|e| {
            fs::remove_dir_all(&temp_dir).ok();
            format!("Failed to install plugin: {}", e)
        })?;
    
    // Create metadata file
    let meta = serde_json::json!({
        "enabled": true,
        "installed_at": chrono::Utc::now().to_rfc3339(),
        "source": "file",
    });
    
    let meta_path = dest_dir.join(".meta.json");
    fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
    Ok(manifest.id)
}

/// Gets the asset URL for a plugin file
pub fn get_plugin_asset_url(plugin_id: &str, file_path: &str) -> Result<String, String> {
    let plugins_dir = get_plugins_dir()?;
    let plugin_dir = plugins_dir.join(plugin_id);
    
    if !plugin_dir.exists() {
        return Err("Plugin not found".to_string());
    }
    
    let file_full_path = plugin_dir.join(file_path);
    if !file_full_path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    // Return the path that will be converted by convertFileSrc on the frontend
    Ok(file_full_path.to_string_lossy().to_string())
}

// Mock store API (in production, this would fetch from a real API)
pub fn get_store_plugins() -> Result<Vec<StorePlugin>, String> {
    // Include first-party plugins
    let mut plugins = vec![
        StorePlugin {
            manifest: PluginManifest {
                id: "com.nuevogaleno.backup".to_string(),
                name: "Backup & Restore".to_string(),
                version: "1.0.0".to_string(),
                author: "Nuevo Galeno".to_string(),
                description: "Sistema de respaldo y restauración de datos de la clínica".to_string(),
                icon: "💾".to_string(),
                entry: "index.tsx".to_string(),
                permissions: vec![
                    "patients:read".to_string(),
                    "treatments:read".to_string(),
                    "appointments:read".to_string(),
                    "payments:read".to_string(),
                    "system:commands".to_string(),
                ],
                hooks: None,
                menu_items: Some(vec![MenuItem {
                    label: "Backup & Restore".to_string(),
                    icon: "💾".to_string(),
                    action: "openMainWindow".to_string(),
                    shortcut: None,
                }]),
                default_size: Some(WindowSize { width: 800, height: 600 }),
                allow_multiple_instances: Some(false),
                min_version: Some("1.0.0".to_string()),
                repository: None,
                homepage: None,
                api_version: "1.0.0".to_string(),
                license: Some("Proprietary".to_string()),
            },
            downloads: 0,
            rating: 5.0,
            reviews: 0,
            verified: true,
            price: None,
            screenshots: None,
            changelog: None,
        },
        StorePlugin {
            manifest: PluginManifest {
                id: "com.nuevogaleno.analytics".to_string(),
                name: "Analytics Dashboard".to_string(),
                version: "1.0.0".to_string(),
                author: "Nuevo Galeno".to_string(),
                description: "Panel de análisis y estadísticas avanzadas de tu clínica dental".to_string(),
                icon: "📊".to_string(),
                entry: "index.tsx".to_string(),
                permissions: vec![
                    "patients:read".to_string(),
                    "treatments:read".to_string(),
                    "appointments:read".to_string(),
                    "payments:read".to_string(),
                ],
                hooks: None,
                menu_items: Some(vec![MenuItem {
                    label: "Analytics".to_string(),
                    icon: "📊".to_string(),
                    action: "openMainWindow".to_string(),
                    shortcut: None,
                }]),
                default_size: Some(WindowSize { width: 1200, height: 800 }),
                allow_multiple_instances: Some(false),
                min_version: Some("1.0.0".to_string()),
                repository: None,
                homepage: None,
                api_version: "1.0.0".to_string(),
                license: Some("Proprietary".to_string()),
            },
            downloads: 0,
            rating: 5.0,
            reviews: 0,
            verified: true,
            price: None,
            screenshots: None,
            changelog: None,
        },
    ];

    // In production, fetch additional plugins from remote API
    // let remote_plugins = fetch_from_api().await?;
    // plugins.extend(remote_plugins);

    Ok(plugins)
}

pub fn read_plugin_component(plugin_id: &str, component_path: &str) -> Result<String, String> {
    let plugins_dir = get_plugins_dir()?;
    let plugin_dir = plugins_dir.join(plugin_id);
    
    if !plugin_dir.exists() {
        return Err("Plugin not found".to_string());
    }
    
    let component_file = plugin_dir.join(component_path);
    
    if !component_file.exists() {
        return Err(format!("Component file not found: {}", component_path));
    }
    
    fs::read_to_string(&component_file)
        .map_err(|e| format!("Failed to read component file: {}", e))
}

pub fn install_plugin_from_store(plugin_id: &str) -> Result<(), String> {
    // Check if it's a first-party plugin
    let first_party_plugins = vec!["com.nuevogaleno.backup", "com.nuevogaleno.analytics"];
    
    if first_party_plugins.contains(&plugin_id) {
        // First-party plugins are bundled, just mark as installed
        let plugins_dir = get_plugins_dir()?;
        let plugin_dir = plugins_dir.join(plugin_id);
        
        if plugin_dir.exists() {
            return Err("Plugin already installed".to_string());
        }
        
        // Create plugin directory
        fs::create_dir_all(&plugin_dir)
            .map_err(|e| format!("Failed to create plugin directory: {}", e))?;
        
        // Copy manifest from bundled location
        let src_manifest = std::path::PathBuf::from("src/plugins")
            .join(plugin_id.split('.').last().unwrap_or(""))
            .join("manifest.json");
        
        let dest_manifest = plugin_dir.join("manifest.json");
        
        if src_manifest.exists() {
            fs::copy(&src_manifest, &dest_manifest)
                .map_err(|e| format!("Failed to copy manifest: {}", e))?;
        } else {
            // Create manifest from store data
            let store_plugins = get_store_plugins()?;
            if let Some(plugin) = store_plugins.iter().find(|p| p.manifest.id == plugin_id) {
                let manifest_str = serde_json::to_string_pretty(&plugin.manifest)
                    .map_err(|e| format!("Failed to serialize manifest: {}", e))?;
                fs::write(&dest_manifest, manifest_str)
                    .map_err(|e| format!("Failed to write manifest: {}", e))?;
            }
        }
        
        // Create metadata
        let meta = serde_json::json!({
            "enabled": true,
            "installed_at": chrono::Utc::now().to_rfc3339(),
            "first_party": true,
        });
        
        let meta_path = plugin_dir.join(".meta.json");
        fs::write(&meta_path, serde_json::to_string_pretty(&meta).unwrap())
            .map_err(|e| format!("Failed to write metadata: {}", e))?;
        
        return Ok(());
    }
    
    // For third-party plugins, would download from store
    Err("Third-party plugin installation not implemented yet".to_string())
}
